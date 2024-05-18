import SDK from "../sdk"
import { type FilenSDKConfig, type FileMetadata, type FolderMetadata, type PublicLinkExpiration, type CloudItemTree } from "@filen/sdk"
import { type FileSystemFileHandle } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import { setItem, getItem, removeItem } from "@/lib/localForage"
import { type WorkerToMainMessage, type DriveCloudItemWithPath } from "./types"
import { ZipWriter } from "@zip.js/zip.js"
import { promiseAllChunked } from "../utils"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"
import eventEmitter from "../eventEmitter"
import { transfer } from "comlink"
import { type CloudItemReceiver } from "@filen/sdk/dist/types/cloud"
import { THUMBNAIL_VERSION, THUMBNAIL_QUALITY, THUMBNAIL_MAX_SIZE } from "@/constants"
import pdfjsLib from "../pdfJS"
import { type Note, type NoteType, type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import { simpleDate } from "@/utils"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { type ChatTypingType } from "@filen/sdk/dist/types/api/v3/chat/typing"
import { type ChatLastFocusValues } from "@filen/sdk/dist/types/api/v3/chat/lastFocusUpdate"
import { type ChatConversationsOnlineUser } from "@filen/sdk/dist/types/api/v3/chat/conversations/online"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { type ContactRequest } from "@filen/sdk/dist/types/api/v3/contacts/requests/in"
import { type BlockedContact } from "@filen/sdk/dist/types/api/v3/contacts/blocked"
import { type UserAccountResponse } from "@filen/sdk/dist/types/api/v3/user/account"
import axios, { type AxiosResponse } from "axios"
import { workerCorsHeadCache, workerParseOGFromURLCache, clearThumbnailCache, calculateThumbnailCacheUsage } from "@/cache"
import { Semaphore } from "../semaphore"
import { type FileLinkStatusResponse } from "@filen/sdk/dist/types/api/v3/file/link/status"
import { v4 as uuidv4 } from "uuid"
import { type UserEvent } from "@filen/sdk/dist/types/api/v3/user/events"
import { type PaymentMethods } from "@filen/sdk/dist/types/api/v3/user/sub/create"
import { type FileVersionsResponse } from "@filen/sdk/dist/types/api/v3/file/versions"

const parseOGFromURLMutex = new Semaphore(1)
const corsHeadMutex = new Semaphore(1)
let isInitialized = false
const postMessageToMainProgressThrottle: Record<string, { next: number; storedBytes: number }> = {}

// We have to throttle the "progress" events of the "download"/"upload" message type. The SDK sends too many events for the IPC to handle properly.
// It freezes the main process if we don't throttle it.
function throttlePostMessageToMain(message: WorkerToMainMessage, callback: (message: WorkerToMainMessage) => void) {
	const now = Date.now()
	let key = ""

	if (message.type === "download" || message.type === "upload") {
		if (message.data.type === "progress") {
			key = `${message.type}:${message.data.uuid}:${message.data.name}:${message.data.type}`

			if (!postMessageToMainProgressThrottle[key]) {
				postMessageToMainProgressThrottle[key] = {
					next: 0,
					storedBytes: 0
				}
			}

			postMessageToMainProgressThrottle[key].storedBytes += message.data.bytes

			if (postMessageToMainProgressThrottle[key].next > now) {
				return
			}

			message = {
				...message,
				data: {
					...message.data,
					bytes: postMessageToMainProgressThrottle[key].storedBytes
				}
			}
		}
	}

	callback(message)

	if (key.length > 0 && postMessageToMainProgressThrottle[key] && (message.type === "download" || message.type === "upload")) {
		postMessageToMainProgressThrottle[key].storedBytes = 0
		postMessageToMainProgressThrottle[key].next = now + 100

		if (
			message.data.type === "error" ||
			message.data.type === "queued" ||
			message.data.type === "stopped" ||
			message.data.type === "finished"
		) {
			delete postMessageToMainProgressThrottle[key]
		}
	}
}

// We setup an eventEmitter first here in case we are running in the main thread.
let postMessageToMain: (message: WorkerToMainMessage) => void = message => {
	throttlePostMessageToMain(message, msg => {
		eventEmitter.emit("workerMessage", msg)
	})
}

export async function waitForInitialization(): Promise<void> {
	// Only check for init if we are running inside a WebWorker.
	if (isInitialized || !(typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope)) {
		return
	}

	await new Promise<void>(resolve => {
		const wait = setInterval(() => {
			if (isInitialized) {
				clearInterval(wait)

				resolve()
			}
		}, 10)
	})
}

export async function initializeSDK({ config }: { config: FilenSDKConfig }): Promise<void> {
	if (isInitialized) {
		return
	}

	SDK.init(config)

	isInitialized = true
}

export async function deinitializeSDK(): Promise<void> {
	if (!isInitialized) {
		return
	}

	SDK.init({})

	isInitialized = false
}

export async function setMessageHandler(callback: (message: WorkerToMainMessage) => void): Promise<void> {
	postMessageToMain = message => throttlePostMessageToMain(message, callback)

	return
}

export async function encryptMetadata({ metadata, key, derive }: { metadata: string; key?: string; derive?: boolean }): Promise<string> {
	await waitForInitialization()

	return await SDK.crypto().encrypt().metadata({ metadata, key, derive })
}

export async function decryptMetadata({ metadata, key }: { metadata: string; key: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.crypto().decrypt().metadata({ metadata, key })
}

export async function getDirectorySizeFromCacheOrFetch({
	uuid,
	sharerId,
	receiverId,
	trash
}: {
	uuid: string
	sharerId?: number
	receiverId?: number
	trash?: boolean
}): Promise<number> {
	await waitForInitialization()

	const cache = await getItem<number | null>("directorySize:" + uuid)

	if (cache) {
		return cache
	}

	const fetched = await directorySize({ uuid, sharerId, receiverId, trash })

	return fetched
}

export async function listDirectory({ uuid, onlyDirectories }: { uuid: string; onlyDirectories?: boolean }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectory({ uuid, onlyDirectories })
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: 0,
								receiverId: 0,
								trash: false
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve({
								...item,
								sharerId: 0,
								sharerEmail: "",
								receiverId: 0,
								receiverEmail: "",
								selected: false,
								receivers: [],
								size: item.type === "directory" && size ? size : item.size
							})
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function listDirectorySharedIn({ uuid }: { uuid: string }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectorySharedIn({ uuid })
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: item.sharerId ?? 0,
								receiverId: item.receiverId ?? 0,
								trash: false
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve(
								item.type === "file"
									? {
											...item,
											sharerId: item.sharerId ?? 0,
											sharerEmail: item.sharerEmail ?? "",
											receiverId: item.receiverId ?? 0,
											receiverEmail: item.receiverEmail ?? "",
											selected: false,
											favorited: false,
											rm: ""
										}
									: {
											...item,
											sharerId: item.sharerId ?? 0,
											sharerEmail: item.sharerEmail ?? "",
											receiverId: item.receiverId ?? 0,
											receiverEmail: item.receiverEmail ?? "",
											selected: false,
											favorited: false,
											size: size ? size : item.size
										}
							)
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function listDirectorySharedOut({ uuid, receiverId }: { uuid: string; receiverId?: number }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectorySharedOut({ uuid, receiverId })
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: item.sharerId ?? 0,
								receiverId: item.receiverId ?? 0,
								trash: false
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve(
								item.type === "file"
									? {
											...item,
											sharerId: item.sharerId ?? 0,
											sharerEmail: item.sharerEmail ?? "",
											receiverId: item.receiverId ?? 0,
											receiverEmail: item.receiverEmail ?? "",
											selected: false,
											favorited: false,
											rm: ""
										}
									: {
											...item,
											sharerId: item.sharerId ?? 0,
											sharerEmail: item.sharerEmail ?? "",
											receiverId: item.receiverId ?? 0,
											receiverEmail: item.receiverEmail ?? "",
											selected: false,
											favorited: false,
											size: size ? size : item.size
										}
							)
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function listFavorites(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listFavorites()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: 0,
								receiverId: 0,
								trash: false
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve({
								...item,
								sharerId: 0,
								sharerEmail: "",
								receiverId: 0,
								receiverEmail: "",
								selected: false,
								receivers: [],
								size: item.type === "directory" && size ? size : item.size
							})
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function listPublicLinks(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listPublicLinks()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: 0,
								receiverId: 0,
								trash: false
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve({
								...item,
								sharerId: 0,
								sharerEmail: "",
								receiverId: 0,
								receiverEmail: "",
								selected: false,
								receivers: [],
								size: item.type === "directory" && size ? size : item.size
							})
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function listRecents(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listRecents()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: 0,
								receiverId: 0,
								trash: false
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve({
								...item,
								sharerId: 0,
								sharerEmail: "",
								receiverId: 0,
								receiverEmail: "",
								selected: false,
								receivers: [],
								size: item.type === "directory" && size ? size : item.size
							})
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function listTrash(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listTrash()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? getDirectorySizeFromCacheOrFetch({
								uuid: item.uuid,
								sharerId: 0,
								receiverId: 0,
								trash: true
							})
						: Promise.resolve(item.size)
					)
						.then(size => {
							if (item.type === "directory") {
								setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
							}

							resolve({
								...item,
								sharerId: 0,
								sharerEmail: "",
								receiverId: 0,
								receiverEmail: "",
								selected: false,
								receivers: [],
								size: item.type === "directory" && size ? size : item.size
							})
						})
						.catch(reject)
				})
		)
	)

	return driveItems
}

export async function downloadFile({ item, fileHandle }: { item: DriveCloudItem; fileHandle: FileSystemFileHandle }): Promise<void> {
	await waitForInitialization()

	if (item.type !== "file") {
		return
	}

	const stream = await SDK.cloud().downloadFileToReadableStream({
		uuid: item.uuid,
		bucket: item.bucket,
		region: item.region,
		version: item.version,
		size: item.size,
		chunks: item.chunks,
		key: item.key,
		onQueued: () => {
			postMessageToMain({
				type: "download",
				data: {
					type: "queued",
					uuid: item.uuid,
					name: item.name
				}
			})
		},
		onStarted: () => {
			postMessageToMain({
				type: "download",
				data: {
					type: "started",
					uuid: item.uuid,
					name: item.name,
					size: item.size
				}
			})
		},
		onProgress: transferred => {
			postMessageToMain({
				type: "download",
				data: {
					type: "progress",
					uuid: item.uuid,
					bytes: transferred,
					name: item.name
				}
			})
		},
		onFinished: () => {
			postMessageToMain({
				type: "download",
				data: {
					type: "finished",
					uuid: item.uuid,
					name: item.name,
					size: item.size
				}
			})
		},
		onError: err => {
			postMessageToMain({
				type: "download",
				data: {
					type: "error",
					uuid: item.uuid,
					err,
					name: item.name,
					size: item.size
				}
			})
		}
	})

	const writer = await fileHandle.createWritable()

	stream.pipeTo(writer)
}

export async function uploadFile({
	file,
	parent,
	sharerId = 0,
	sharerEmail = "",
	receiverId = 0,
	receiverEmail = "",
	receivers = [],
	name
}: {
	file: File
	parent: string
	sharerId?: number
	sharerEmail?: string
	receiverId?: number
	receiverEmail?: string
	receivers?: CloudItemReceiver[]
	name?: string
}): Promise<DriveCloudItem> {
	await waitForInitialization()

	const fileName = name ? name : file.name
	const fileId = `${fileName}:${file.size}:${file.type}:${file.lastModified}:${file.webkitRelativePath}`

	const item = await SDK.cloud().uploadWebFile({
		file,
		parent,
		name: fileName,
		onQueued: () => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "queued",
					uuid: fileId,
					name: fileName
				}
			})
		},
		onStarted: () => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "started",
					uuid: fileId,
					name: fileName,
					size: file.size
				}
			})
		},
		onProgress: transferred => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "progress",
					uuid: fileId,
					bytes: transferred,
					name: fileName
				}
			})
		},
		onFinished: () => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "finished",
					uuid: fileId,
					name: fileName,
					size: file.size
				}
			})
		},
		onError: err => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "error",
					uuid: fileId,
					err,
					name: fileName,
					size: file.size
				}
			})
		},
		onUploaded: async item => {
			// TODO: Thumbnail processing etc.

			console.log(item)
		}
	})

	return {
		...item,
		sharerId,
		sharerEmail,
		receiverId,
		receiverEmail,
		selected: false,
		receivers
	}
}

export async function uploadDirectory({
	files,
	parent,
	sharerId = 0,
	sharerEmail = "",
	receiverId = 0,
	receiverEmail = "",
	receivers = []
}: {
	files: { file: File; webkitRelativePath: string }[]
	parent: string
	sharerId?: number
	sharerEmail?: string
	receiverId?: number
	receiverEmail?: string
	receivers?: CloudItemReceiver[]
}): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const directoryId = Math.random().toString().slice(2)
	const items: DriveCloudItem[] = []
	let size = 0
	let name: string | null = null
	let didQueue = false
	let didStart = false
	let didError = false

	for (const file of files) {
		Object.defineProperty(file.file, "webkitRelativePath", {
			value: file.webkitRelativePath,
			writable: true
		})

		size += file.file.size

		const ex = file.webkitRelativePath.split("/")

		if (ex[0] && ex[0].length > 0 && !name) {
			name = ex[0].trim()
		}
	}

	if (!name) {
		name = "Directory"
	}

	try {
		await SDK.cloud().uploadDirectoryFromWeb({
			files: files.map(file => file.file) as unknown as FileList,
			parent,
			name,
			onQueued: () => {
				if (didQueue) {
					return
				}

				didQueue = true

				postMessageToMain({
					type: "upload",
					data: {
						type: "queued",
						uuid: directoryId,
						name: name!
					}
				})
			},
			onStarted: () => {
				if (didStart) {
					return
				}

				didStart = true

				postMessageToMain({
					type: "upload",
					data: {
						type: "started",
						uuid: directoryId,
						name: name!,
						size
					}
				})
			},
			onProgress: transferred => {
				postMessageToMain({
					type: "upload",
					data: {
						type: "progress",
						uuid: directoryId,
						bytes: transferred,
						name: name!
					}
				})
			},
			onError: err => {
				if (didError) {
					return
				}

				didError = true

				postMessageToMain({
					type: "upload",
					data: {
						type: "error",
						uuid: directoryId,
						err,
						name: name!,
						size
					}
				})
			},
			onDirectoryCreated: item => {
				setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)

				items.push({
					...item,
					sharerId,
					sharerEmail,
					receiverId,
					receiverEmail,
					selected: false,
					receivers
				})
			},
			onUploaded: async item => {
				items.push({
					...item,
					sharerId,
					sharerEmail,
					receiverId,
					receiverEmail,
					selected: false,
					receivers
				})

				// TODO: Thumbnail processing etc.
			}
		})

		postMessageToMain({
			type: "upload",
			data: {
				type: "finished",
				uuid: directoryId,
				name: name!,
				size
			}
		})

		return items
	} catch (e) {
		if (!didError) {
			didError = true

			const err = e as unknown as Error

			postMessageToMain({
				type: "upload",
				data: {
					type: "error",
					uuid: directoryId,
					err,
					name: name!,
					size
				}
			})
		}

		throw e
	}
}

const directorySizeRateLimit: Record<string, number> = {}

export async function directorySize({
	uuid,
	sharerId,
	receiverId,
	trash
}: {
	uuid: string
	sharerId?: number | undefined
	receiverId?: number | undefined
	trash?: boolean | undefined
}): Promise<number> {
	await waitForInitialization()

	const rateLimitKey = `${uuid}:${sharerId ?? 0}:${receiverId ?? 0}:${trash ?? false}`
	const now = Date.now()

	if (directorySizeRateLimit[rateLimitKey] && now < directorySizeRateLimit[rateLimitKey]) {
		const cache = await getItem<number | null>("directorySize:" + uuid)

		if (cache) {
			return cache
		}
	}

	directorySizeRateLimit[rateLimitKey] = now + 30000

	const fetched = await SDK.cloud().directorySize({ uuid, sharerId, receiverId, trash })

	await setItem("directorySize:" + uuid, fetched)

	return fetched
}

export async function downloadMultipleFilesAndDirectoriesAsZip({
	items,
	fileHandle,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	dontEmitQueuedEvent,
	id
}: {
	items: DriveCloudItemWithPath[]
	fileHandle: FileSystemFileHandle
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	dontEmitQueuedEvent?: boolean
	id?: string
}): Promise<void> {
	await waitForInitialization()

	const itemsWithPath: DriveCloudItemWithPath[] = []
	const writer = await fileHandle.createWritable()
	const zipWriter = new ZipWriter(writer, {
		level: 0
	})
	const treePromises: Promise<void>[] = []
	const directoryName = fileHandle.name
	let directorySize = 0
	const directoryId = id ? id : uuidv4()
	let didQueue = typeof dontEmitQueuedEvent === "boolean" ? dontEmitQueuedEvent : false
	let didStart = false
	let didError = false

	try {
		for (const item of items) {
			if (item.type === "directory") {
				treePromises.push(
					new Promise((resolve, reject) => {
						getDirectoryTree({
							uuid: item.uuid,
							type,
							linkHasPassword,
							linkPassword,
							linkSalt,
							linkUUID
						})
							.then(tree => {
								for (const path in tree) {
									const treeItem = tree[path]

									if (treeItem.type !== "file") {
										continue
									}

									itemsWithPath.push({
										...treeItem,
										sharerId: 0,
										sharerEmail: "",
										receiverId: 0,
										receiverEmail: "",
										selected: false,
										receivers: [],
										timestamp: treeItem.lastModified,
										favorited: false,
										path: `${item.name}/${path.startsWith("/") ? path.slice(1) : path}`,
										rm: ""
									})
								}

								resolve()
							})
							.catch(reject)
					})
				)
			} else {
				itemsWithPath.push(item)
			}
		}

		await promiseAllChunked(treePromises)

		if (itemsWithPath.length === 0) {
			postMessageToMain({
				type: "download",
				data: {
					type: "finished",
					uuid: directoryId,
					name: directoryName,
					size: directorySize
				}
			})

			return
		}

		directorySize = itemsWithPath.reduce((prev, item) => prev + item.size, 0)

		await promiseAllChunked(
			itemsWithPath.map(item => {
				return new Promise<void>((resolve, reject) => {
					if (item.type !== "file") {
						resolve()

						return
					}

					SDK.cloud()
						.downloadFileToReadableStream({
							uuid: item.uuid,
							bucket: item.bucket,
							region: item.region,
							version: item.version,
							chunks: item.chunks,
							size: item.size,
							key: item.key,
							onQueued: () => {
								if (didQueue) {
									return
								}

								didQueue = true

								postMessageToMain({
									type: "download",
									data: {
										type: "queued",
										uuid: directoryId,
										name: directoryName
									}
								})
							},
							onStarted: () => {
								if (didStart) {
									return
								}

								didStart = true

								postMessageToMain({
									type: "download",
									data: {
										type: "started",
										uuid: directoryId,
										name: directoryName,
										size: directorySize
									}
								})
							},
							onProgress: transferred => {
								postMessageToMain({
									type: "download",
									data: {
										type: "progress",
										uuid: directoryId,
										name: directoryName,
										bytes: transferred
									}
								})
							},
							onError: err => {
								if (didError) {
									return
								}

								didError = true

								postMessageToMain({
									type: "download",
									data: {
										type: "error",
										uuid: directoryId,
										name: directoryName,
										size: directorySize,
										err
									}
								})
							}
						})
						.then(stream => {
							zipWriter
								.add(item.path, stream, {
									lastModDate: new Date(item.lastModified),
									lastAccessDate: new Date(item.lastModified),
									creationDate: new Date(item.lastModified)
								})
								.then(() => resolve())
								.catch(reject)
						})
						.catch(reject)
				})
			})
		)

		await zipWriter.close()

		postMessageToMain({
			type: "download",
			data: {
				type: "finished",
				uuid: directoryId,
				name: directoryName,
				size: directorySize
			}
		})
	} catch (e) {
		if (!didError) {
			didError = true

			const err = e as unknown as Error

			postMessageToMain({
				type: "download",
				data: {
					type: "error",
					uuid: directoryId,
					name: directoryName,
					size: directorySize,
					err
				}
			})
		}

		throw e
	}
}

export async function getDirectoryTree({
	uuid,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	skipCache
}: {
	uuid: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	skipCache?: boolean
}) {
	await waitForInitialization()

	return await SDK.cloud().getDirectoryTree({ uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt, skipCache })
}

export async function downloadDirectory({
	uuid,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	fileHandle
}: {
	uuid: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	fileHandle: FileSystemFileHandle
}): Promise<void> {
	await waitForInitialization()

	const directoryId = uuidv4()
	const directoryName = fileHandle.name
	const items: DriveCloudItemWithPath[] = []

	postMessageToMain({
		type: "download",
		data: {
			type: "queued",
			uuid: directoryId,
			name: directoryName
		}
	})

	let tree: Record<string, CloudItemTree> = {}

	try {
		tree = await getDirectoryTree({
			uuid,
			type,
			linkUUID,
			linkHasPassword,
			linkPassword,
			linkSalt
		})
	} catch (e) {
		const err = e as unknown as Error

		postMessageToMain({
			type: "download",
			data: {
				type: "error",
				uuid: directoryId,
				err,
				name: directoryName,
				size: 0
			}
		})

		throw e
	}

	if (Object.keys(tree).length === 0) {
		postMessageToMain({
			type: "download",
			data: {
				type: "finished",
				uuid: directoryId,
				name: directoryName,
				size: 0
			}
		})

		return
	}

	for (const path in tree) {
		const item = tree[path]

		if (item.type !== "file") {
			continue
		}

		items.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: [],
			timestamp: item.lastModified,
			favorited: false,
			path: `${path.startsWith("/") ? path.slice(1) : path}`,
			rm: ""
		})
	}

	if (items.length === 0) {
		return
	}

	await downloadMultipleFilesAndDirectoriesAsZip({
		items,
		fileHandle,
		type,
		linkUUID,
		linkHasPassword,
		linkPassword,
		linkSalt,
		dontEmitQueuedEvent: true,
		id: directoryId
	})
}

export async function moveItems({ items, parent }: { items: DriveCloudItem[]; parent: string }): Promise<void> {
	await waitForInitialization()

	await promiseAllChunked(
		items.map(item =>
			item.parent === parent
				? Promise.resolve()
				: item.type === "file"
					? SDK.cloud().moveFile({
							uuid: item.uuid,
							to: parent,
							metadata: {
								name: item.name,
								key: item.key,
								hash: item.hash,
								creation: item.creation,
								mime: item.mime,
								lastModified: item.lastModified,
								size: item.size
							} satisfies FileMetadata
						})
					: SDK.cloud().moveDirectory({
							uuid: item.uuid,
							to: parent,
							metadata: {
								name: item.name
							} satisfies FolderMetadata
						})
		)
	)
}

export async function deleteItemsPermanently({ items }: { items: DriveCloudItem[] }): Promise<void> {
	await waitForInitialization()

	await promiseAllChunked(
		items.map(item =>
			item.type === "file"
				? SDK.cloud().deleteFile({
						uuid: item.uuid
					})
				: SDK.cloud().deleteDirectory({
						uuid: item.uuid
					})
		)
	)

	for (const item of items) {
		if (item.type === "directory") {
			removeItem(`directoryUUIDToName:${item.uuid}`).catch(console.error)
		}
	}
}

export async function trashItems({ items }: { items: DriveCloudItem[] }): Promise<void> {
	await waitForInitialization()

	await promiseAllChunked(
		items.map(item =>
			item.type === "file"
				? SDK.cloud().trashFile({
						uuid: item.uuid
					})
				: SDK.cloud().trashDirectory({
						uuid: item.uuid
					})
		)
	)
}

export async function restoreItems({ items }: { items: DriveCloudItem[] }): Promise<void> {
	await waitForInitialization()

	await promiseAllChunked(
		items.map(item =>
			item.type === "file"
				? SDK.cloud().restoreFile({
						uuid: item.uuid
					})
				: SDK.cloud().restoreDirectory({
						uuid: item.uuid
					})
		)
	)
}

export async function favoriteItems({ items, favorite }: { items: DriveCloudItem[]; favorite: boolean }): Promise<void> {
	await waitForInitialization()

	await promiseAllChunked(
		items.map(item =>
			item.favorited === favorite
				? Promise.resolve()
				: item.type === "file"
					? SDK.cloud().favoriteFile({
							uuid: item.uuid,
							favorite
						})
					: SDK.cloud().favoriteDirectory({
							uuid: item.uuid,
							favorite
						})
		)
	)
}

export async function readFile({
	item,
	start,
	end,
	emitEvents = true
}: {
	item: DriveCloudItem
	start?: number
	end?: number
	emitEvents?: boolean
}): Promise<Buffer> {
	await waitForInitialization()

	if (item.type !== "file") {
		return Buffer.from([])
	}

	const stream = await SDK.cloud().downloadFileToReadableStream({
		uuid: item.uuid,
		bucket: item.bucket,
		region: item.region,
		chunks: item.chunks,
		version: item.version,
		size: item.size,
		key: item.key,
		start,
		end,
		onQueued: () => {
			if (!emitEvents) {
				return
			}

			postMessageToMain({
				type: "download",
				data: {
					type: "queued",
					uuid: item.uuid,
					name: item.name
				}
			})
		},
		onStarted: () => {
			if (!emitEvents) {
				return
			}

			postMessageToMain({
				type: "download",
				data: {
					type: "started",
					uuid: item.uuid,
					name: item.name,
					size: item.size
				}
			})
		},
		onProgress: transferred => {
			if (!emitEvents) {
				return
			}

			postMessageToMain({
				type: "download",
				data: {
					type: "progress",
					uuid: item.uuid,
					bytes: transferred,
					name: item.name
				}
			})
		},
		onFinished: () => {
			if (!emitEvents) {
				return
			}

			postMessageToMain({
				type: "download",
				data: {
					type: "finished",
					uuid: item.uuid,
					name: item.name,
					size: item.size
				}
			})
		},
		onError: err => {
			if (!emitEvents) {
				return
			}

			postMessageToMain({
				type: "download",
				data: {
					type: "error",
					uuid: item.uuid,
					err,
					name: item.name,
					size: item.size
				}
			})
		}
	})

	let buffer = Buffer.from([])
	const reader = stream.getReader()
	let doneReading = false

	while (!doneReading) {
		const { done, value } = await reader.read()

		if (done) {
			doneReading = true

			break
		}

		if (value instanceof Uint8Array && value.byteLength > 0) {
			buffer = Buffer.concat([buffer, value])
		}
	}

	return transfer(buffer, [buffer.buffer])
}

export async function generateImageThumbnail({ item }: { item: DriveCloudItem }): Promise<Blob> {
	await waitForInitialization()

	if (item.type !== "file") {
		throw new Error("Item not of type file.")
	}

	const dbKey = `thumbnail:${item.uuid}:${THUMBNAIL_VERSION}`
	const fromDb = await getItem<Blob>(dbKey)

	if (fromDb) {
		return fromDb
	}

	const buffer = await readFile({ item, emitEvents: false })
	const imageBitmap = await createImageBitmap(new Blob([buffer], { type: item.mime }))

	const originalWidth = imageBitmap.width
	const originalHeight = imageBitmap.height
	let newWidth: number
	let newHeight: number

	if (originalWidth > originalHeight) {
		newWidth = THUMBNAIL_MAX_SIZE
		newHeight = (originalHeight / originalWidth) * THUMBNAIL_MAX_SIZE
	} else {
		newHeight = THUMBNAIL_MAX_SIZE
		newWidth = (originalWidth / originalHeight) * THUMBNAIL_MAX_SIZE
	}

	const offscreenCanvas = new OffscreenCanvas(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE)
	const ctx = offscreenCanvas.getContext("2d")

	if (!ctx) {
		throw new Error("Could not create OffscreenCanvas")
	}

	ctx.fillStyle = "#000000"
	ctx.fillRect(0, 0, THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE)

	const offsetX = (THUMBNAIL_MAX_SIZE - newWidth) / 2
	const offsetY = (THUMBNAIL_MAX_SIZE - newHeight) / 2

	ctx.drawImage(imageBitmap, offsetX, offsetY, newWidth, newHeight)

	const blob = await offscreenCanvas.convertToBlob({ type: "image/jpeg", quality: THUMBNAIL_QUALITY })

	await setItem<Blob>(dbKey, blob)

	return blob
}

/**
 * Generate a video thumbnail. Only works on the main thread due requiring a <video /> element.
 * @date 3/20/2024 - 11:21:23 PM
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem; buffer: Buffer }} param0
 * @param {DriveCloudItem} param0.item
 * @param {Buffer} param0.buffer
 * @returns {Promise<Blob>}
 */
export async function generateVideoThumbnail({ item, buffer }: { item: DriveCloudItem; buffer: Buffer }): Promise<Blob> {
	await waitForInitialization()

	if (!document) {
		throw new Error("generateVideoThumbnail cannot be run in a WebWorker.")
	}

	if (item.type !== "file") {
		throw new Error("Item not of type file.")
	}

	const dbKey = `thumbnail:${item.uuid}:${THUMBNAIL_VERSION}`
	const fromDb = await getItem<Blob>(dbKey)

	if (fromDb) {
		return fromDb
	}

	const chunkedBlob = new Blob([buffer], { type: item.mime })
	const urlObject = globalThis.URL.createObjectURL(chunkedBlob)
	const video = document.createElement("video")

	const blob = await new Promise<Blob>((resolve, reject) => {
		video.src = urlObject

		video.onerror = e => {
			reject(e)
		}

		video.onloadedmetadata = () => {
			if (video.duration < 1) {
				reject(new Error("Video is too short to generate thumbnail"))

				return
			}

			setTimeout(() => {
				video.currentTime = 1
			}, 100)
		}

		video.onseeked = () => {
			const originalWidth = video.videoWidth
			const originalHeight = video.videoHeight
			let newWidth: number
			let newHeight: number

			if (originalWidth > originalHeight) {
				newWidth = THUMBNAIL_MAX_SIZE
				newHeight = (originalHeight / originalWidth) * THUMBNAIL_MAX_SIZE
			} else {
				newHeight = THUMBNAIL_MAX_SIZE
				newWidth = (originalWidth / originalHeight) * THUMBNAIL_MAX_SIZE
			}

			const canvas = document.createElement("canvas")
			const ctx = canvas.getContext("2d")

			if (!ctx) {
				reject(new Error("Could not create canvas"))

				return
			}

			ctx.fillStyle = "#000000"
			ctx.fillRect(0, 0, THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE)

			const offsetX = (THUMBNAIL_MAX_SIZE - newWidth) / 2
			const offsetY = (THUMBNAIL_MAX_SIZE - newHeight) / 2

			ctx.drawImage(video, offsetX, offsetY, newWidth, newHeight)

			canvas.toBlob(
				blob => {
					if (!blob) {
						reject(new Error("Could not generate blob."))

						return
					}

					resolve(blob)
				},
				"image/jpeg",
				THUMBNAIL_QUALITY
			)
		}

		video.load()
	}).finally(() => {
		globalThis.URL.revokeObjectURL(urlObject)
		video.remove()
	})

	await setItem<Blob>(dbKey, blob)

	return blob
}

/**
 * Generate a PDF thumbnail. Only works on the main thread due to PDF.js not supporting OffscreenCanvas.
 * @date 3/20/2024 - 11:21:18 PM
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem; buffer: Buffer }} param0
 * @param {DriveCloudItem} param0.item
 * @param {Buffer} param0.buffer
 * @returns {Promise<Blob>}
 */
export async function generatePDFThumbnail({ item, buffer }: { item: DriveCloudItem; buffer: Buffer }): Promise<Blob> {
	await waitForInitialization()

	if (!document) {
		throw new Error("generatePDFThumbnail cannot be run in a WebWorker.")
	}

	if (item.type !== "file") {
		throw new Error("Item not of type file.")
	}

	const dbKey = `thumbnail:${item.uuid}:${THUMBNAIL_VERSION}`
	const fromDb = await getItem<Blob>(dbKey)

	if (fromDb) {
		return fromDb
	}

	const pdf = await pdfjsLib.getDocument(buffer).promise
	const page = await pdf.getPage(1)

	let viewport = page.getViewport({ scale: 1 })
	const originalWidth = viewport.width
	const originalHeight = viewport.height
	let newWidth: number
	let newHeight: number

	if (originalWidth > originalHeight) {
		newWidth = THUMBNAIL_MAX_SIZE
		newHeight = (originalHeight / originalWidth) * THUMBNAIL_MAX_SIZE
	} else {
		newHeight = THUMBNAIL_MAX_SIZE
		newWidth = (originalWidth / originalHeight) * THUMBNAIL_MAX_SIZE
	}

	if (newWidth !== originalWidth) {
		viewport = page.getViewport({ scale: newWidth / viewport.width })
	} else if (newHeight !== originalHeight) {
		viewport = page.getViewport({ scale: newHeight / viewport.height })
	}

	const canvas = document.createElement("canvas")
	const ctx = canvas.getContext("2d")

	if (!ctx) {
		throw new Error("Could not create canvas")
	}

	ctx.fillStyle = "#000000"
	ctx.fillRect(0, 0, THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE)

	await page.render({ canvasContext: ctx, viewport }).promise

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			blob => {
				if (!blob) {
					reject(new Error("Could not generate blob."))

					return
				}

				resolve(blob)
			},
			"image/jpeg",
			THUMBNAIL_QUALITY
		)
	})

	canvas.remove()

	await setItem<Blob>(dbKey, blob)

	return blob
}

export async function renameItem({ item, name }: { item: DriveCloudItem; name: string }): Promise<void> {
	await waitForInitialization()

	await (item.name.toLowerCase() === name.toLowerCase()
		? Promise.resolve()
		: item.type === "file"
			? SDK.cloud().renameFile({
					uuid: item.uuid,
					metadata: {
						name,
						size: item.size,
						key: item.key,
						mime: item.mime,
						hash: item.hash,
						lastModified: item.lastModified,
						creation: item.creation
					} satisfies FileMetadata,
					name
				})
			: SDK.cloud().renameDirectory({ uuid: item.uuid, name }))

	if (item.type === "directory") {
		await setItem(`directoryUUIDToName:${item.uuid}`, name)
	}
}

export async function createDirectory({
	name,
	parent,
	sharerId = 0,
	sharerEmail = "",
	receiverId = 0,
	receiverEmail = "",
	receivers = []
}: {
	name: string
	parent: string
	sharerId?: number
	sharerEmail?: string
	receiverId?: number
	receiverEmail?: string
	receivers?: CloudItemReceiver[]
}): Promise<DriveCloudItem> {
	await waitForInitialization()

	const uuid = await SDK.cloud().createDirectory({ name, parent })

	await setItem(`directoryUUIDToName:${uuid}`, name)

	return {
		name,
		parent,
		uuid,
		type: "directory",
		lastModified: Date.now(),
		timestamp: Date.now(),
		sharerEmail,
		sharerId,
		selected: false,
		size: 0,
		receiverEmail,
		receiverId,
		receivers,
		favorited: false,
		color: null
	}
}

export async function shareItemsToUser({
	items,
	receiverEmail,
	requestUUID = Math.random().toString().slice(2)
}: {
	items: DriveCloudItem[]
	receiverEmail: string
	requestUUID?: string
}): Promise<void> {
	await waitForInitialization()

	await SDK.cloud().shareItemsToUser({
		files: items
			.filter(item => item.type === "file")
			.map(item => ({
				uuid: item.uuid,
				metadata: {
					name: item.name,
					key: (item as { key: string }).key,
					size: item.size,
					mime: (item as { mime: string }).mime,
					hash: (item as { hash?: string }).hash,
					lastModified: item.lastModified,
					creation: (item as { creation?: number }).creation
				} satisfies FileMetadata,
				parent: item.parent
			})),
		directories: items
			.filter(item => item.type === "directory")
			.map(item => ({
				uuid: item.uuid,
				metadata: {
					name: item.name
				} satisfies FolderMetadata,
				parent: item.parent
			})),
		email: receiverEmail,
		onProgress: done => {
			postMessageToMain({ type: "shareProgress", done, total: items.length, requestUUID })
		}
	})
}

export async function listNotes(): Promise<Note[]> {
	await waitForInitialization()

	return await SDK.notes().all()
}

export async function fetchNoteContent({ uuid }: { uuid: string }): Promise<{
	content: string
	type: NoteType
	editedTimestamp: number
	editorId: number
	preview: string
}> {
	await waitForInitialization()

	return await SDK.notes().content({ uuid })
}

export async function editNoteTitle({ uuid, title }: { uuid: string; title: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().editTitle({ uuid, title })
}

export async function editNoteContent({ uuid, content, type }: { uuid: string; content: string; type: NoteType }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().edit({ uuid, content, type })
}

export async function createNote(): Promise<{ uuid: string; title: string }> {
	const title = simpleDate(Date.now())
	const uuid = await SDK.notes().create({ title })

	return {
		title,
		uuid
	}
}

export async function trashNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().trash({ uuid })
}

export async function deleteNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().delete({ uuid })
}

export async function pinNote({ uuid, pin }: { uuid: string; pin: boolean }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().pin({ uuid, pin })
}

export async function favoriteNote({ uuid, favorite }: { uuid: string; favorite: boolean }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().favorite({ uuid, favorite })
}

export async function duplicateNote({ uuid }: { uuid: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.notes().duplicate({ uuid })
}

export async function listNotesTags(): Promise<NoteTag[]> {
	await waitForInitialization()

	return await SDK.notes().tags()
}

export async function createNotesTag({ name }: { name: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.notes().createTag({ name })
}

export async function changeNoteType({ uuid, type }: { uuid: string; type: NoteType }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().changeType({ uuid, newType: type })
}

export async function restoreNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().restore({ uuid })
}

export async function archiveNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().archive({ uuid })
}

export async function favoriteNotesTag({ uuid, favorite }: { uuid: string; favorite: boolean }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().tagFavorite({ uuid, favorite })
}

export async function deleteNotesTag({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().deleteTag({ uuid })
}

export async function renameNotesTag({ uuid, name }: { uuid: string; name: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().renameTag({ uuid, name })
}

export async function tagNote({ uuid, tag }: { uuid: string; tag: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().tag({ uuid, tag })
}

export async function untagNote({ uuid, tag }: { uuid: string; tag: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.notes().untag({ uuid, tag })
}

export async function listChatsConversations(): Promise<ChatConversation[]> {
	await waitForInitialization()

	return await SDK.chats().conversations()
}

export async function fetchChatsConversationsMessages({ uuid, timestamp }: { uuid: string; timestamp?: number }): Promise<ChatMessage[]> {
	await waitForInitialization()

	return await SDK.chats().messages({ conversation: uuid, timestamp: timestamp ? timestamp : Date.now() + 3600000 })
}

export async function sendChatMessage({
	conversation,
	message,
	replyTo,
	uuid
}: {
	conversation: string
	message: string
	replyTo: string
	uuid?: string
}): Promise<string> {
	await waitForInitialization()

	return await SDK.chats().sendMessage({ conversation, message, replyTo, uuid })
}

export async function sendChatTyping({ conversation, type }: { conversation: string; type: ChatTypingType }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().sendTyping({ conversation, type })
}

export async function chatKey({ conversation }: { conversation: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.chats().chatKey({ conversation })
}

export async function noteKey({ uuid }: { uuid: string }): Promise<string> {
	return await SDK.notes().noteKey({ uuid })
}

export async function decryptChatMessage({ message, key }: { message: string; key: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.crypto().decrypt().chatMessage({ message, key })
}

export async function chatLastFocus(): Promise<ChatLastFocusValues[]> {
	await waitForInitialization()

	return await SDK.chats().lastFocus()
}

export async function chatUpdateLastFocus({ values }: { values: ChatLastFocusValues[] }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().updateLastFocus({ values })
}

export async function chatDeleteMessage({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().deleteMessage({ uuid })
}

export async function chatEditMessage({
	uuid,
	conversation,
	message
}: {
	uuid: string
	conversation: string
	message: string
}): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().editMessage({ uuid, conversation, message })
}

export async function chatEditConversationName({ conversation, name }: { conversation: string; name: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().editConversationName({ conversation, name })
}

export async function deleteChatConversation({ conversation }: { conversation: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().delete({ conversation })
}

export async function chatRemoveParticipant({ conversation, userId }: { conversation: string; userId: number }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().removeParticipant({ conversation, userId })
}

export async function decryptFileMetadata({ metadata }: { metadata: string }): Promise<FileMetadata> {
	await waitForInitialization()

	return await SDK.crypto().decrypt().fileMetadata({ metadata })
}

export async function decryptFolderMetadata({ metadata }: { metadata: string }): Promise<FolderMetadata> {
	await waitForInitialization()

	return await SDK.crypto().decrypt().folderMetadata({ metadata })
}

export async function changeDirectoryColor({ color, uuid }: { color: string; uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.cloud().changeDirectoryColor({ uuid, color })
}

export async function chatConversationOnline({ conversation }: { conversation: string }): Promise<ChatConversationsOnlineUser[]> {
	await waitForInitialization()

	return await SDK.chats().conversationOnline({ conversation })
}

export async function listContacts(): Promise<Contact[]> {
	await waitForInitialization()

	return await SDK.contacts().all()
}

export async function chatConversationUnreadCount({ conversation }: { conversation: string }): Promise<number> {
	await waitForInitialization()

	return await SDK.chats().conversationUnreadCount({ conversation })
}

export async function chatMarkConversationAsRead({ conversation }: { conversation: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().markConversationAsRead({ conversation })
}

export async function chatsUnreadCount(): Promise<number> {
	await waitForInitialization()

	return await SDK.chats().unread()
}

export async function listContactsRequestsIn(): Promise<ContactRequest[]> {
	await waitForInitialization()

	return await SDK.contacts().incomingRequests()
}

export async function listContactsRequestsOut(): Promise<ContactRequest[]> {
	await waitForInitialization()

	return await SDK.contacts().outgoingRequests()
}

export async function listBlockedContacts(): Promise<BlockedContact[]> {
	await waitForInitialization()

	return await SDK.contacts().blocked()
}

export async function removeContact({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().remove({ uuid })
}

export async function blockUser({ email }: { email: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().block({ email })
}

export async function unblockUser({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().unblock({ uuid })
}

export async function contactsRequestAccept({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().acceptRequest({ uuid })
}

export async function contactsRequestDeny({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().denyRequest({ uuid })
}

export async function contactsRequestRemove({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().deleteOutgoingRequest({ uuid })
}

export async function contactsRequestSend({ email }: { email: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.contacts().sendRequest({ email })
}

export async function contactsRequestInCount(): Promise<number> {
	await waitForInitialization()

	return await SDK.contacts().incomingRequestsCount()
}

export async function createChatConversation({ contacts }: { contacts: Contact[] }): Promise<string> {
	await waitForInitialization()

	return await SDK.chats().create({ contacts })
}

export async function fetchUserAccount(): Promise<UserAccountResponse> {
	await waitForInitialization()

	return await SDK.user().account()
}

export async function chatConversationAddParticipant({ conversation, contact }: { conversation: string; contact: Contact }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().addParticipant({ conversation, contact })
}

export async function corsHead(url: string): Promise<Record<string, string>> {
	await waitForInitialization()

	await corsHeadMutex.acquire()

	try {
		if (workerCorsHeadCache.has(url)) {
			return workerCorsHeadCache.get(url)!
		}

		try {
			const response = await axios.head(url, {
				timeout: 15000
			})

			if (typeof response.headers["content-type"] !== "string") {
				throw new Error("Response type is not string: " + url)
			}

			workerCorsHeadCache.set(url, response.headers as Record<string, string>)

			return response.headers as Record<string, string>
		} catch {
			// Noop
		}

		const response = await axios.head("https://gateway.filen.io/v3/cors?url=" + encodeURIComponent(url), {
			timeout: 15000
		})

		if (typeof response.headers["content-type"] !== "string") {
			throw new Error("Response type is not string: " + url)
		}

		workerCorsHeadCache.set(url, response.headers as Record<string, string>)

		return response.headers as Record<string, string>
	} finally {
		corsHeadMutex.release()
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function corsGet(url: string): Promise<any> {
	await waitForInitialization()

	try {
		const response = await axios.get(url, {
			timeout: 15000
		})

		if (typeof response.headers["content-type"] !== "string") {
			throw new Error("Response type is not string: " + url)
		}

		return response.data
	} catch {
		// Noop
	}

	const response = await axios.get("https://gateway.filen.io/v3/cors?url=" + encodeURIComponent(url), {
		timeout: 15000
	})

	if (typeof response.headers["content-type"] !== "string") {
		throw new Error("Response type is not string: " + url)
	}

	return response.data
}

export async function parseOGFromURL(url: string): Promise<Record<string, string>> {
	await waitForInitialization()

	await parseOGFromURLMutex.acquire()

	try {
		if (workerParseOGFromURLCache.has(url)) {
			return workerParseOGFromURLCache.get(url)!
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let response: AxiosResponse<any, any>

		try {
			response = await axios.get("https://gateway.filen.io/v3/cors?url=" + encodeURIComponent(url), {
				timeout: 15000
			})

			if (
				typeof response.headers["content-type"] !== "string" ||
				response.headers["content-type"].split(";")[0].trim() !== "text/html"
			) {
				throw new Error("Response type is not text/html: " + url)
			}
		} catch {
			// Noop
		}

		response = await axios.get("https://gateway.filen.io/v3/cors?url=" + encodeURIComponent(url), {
			timeout: 15000
		})

		if (typeof response.headers["content-type"] !== "string" || response.headers["content-type"].split(";")[0].trim() !== "text/html") {
			throw new Error("Response type is not text/html: " + url)
		}

		const metadata: Record<string, string> = {}
		const ogTags = response.data.match(/<meta\s+property="og:([^"]+)"\s+content="([^"]+)"\s*\/?>/g)
		const ogTags2 = response.data.match(/<meta\s+property='og:([^']+)'\s+content='([^']+)'\s*\/?>/g)

		if (ogTags) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			ogTags.forEach((tag: any) => {
				const [, property, content] = tag.match(/<meta\s+property="og:([^"]+)"\s+content="([^"]+)"\s*\/?>/)

				if (typeof property === "string" && typeof content === "string") {
					metadata["og:" + property] = content
				}
			})
		}

		if (ogTags2) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			ogTags2.forEach((tag: any) => {
				const [, property, content] = tag.match(/<meta\s+property='og:([^']+)'\s+content='([^']+)'\s*\/?>/)

				if (typeof property === "string" && typeof content === "string") {
					metadata["og:" + property] = content
				}
			})
		}

		const otherTags = response.data.match(/<meta\s+name="([^"]+)"\s+content="([^"]+)"\s*\/?>/g)
		const otherTags2 = response.data.match(/<meta\s+name='([^']+)'\s+content='([^']+)'\s*\/?>/g)

		if (otherTags) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			otherTags.forEach((tag: any) => {
				const [, name, content] = tag.match(/<meta\s+name="([^"]+)"\s+content="([^"]+)"\s*\/?>/)

				if (typeof name === "string" && typeof content === "string") {
					metadata["meta:" + name] = content
				}
			})
		}

		if (otherTags2) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			otherTags2.forEach((tag: any) => {
				const [, name, content] = tag.match(/<meta\s+name='([^']+)'\s+content='([^']+)'\s*\/?>/)

				if (typeof name === "string" && typeof content === "string") {
					metadata["meta:" + name] = content
				}
			})
		}

		const titleMatch = response.data.match(/<title>([^<]+)<\/title>/)

		if (titleMatch && titleMatch[1] && typeof titleMatch[1] === "string") {
			metadata["title"] = titleMatch[1]
		}

		const faviconMatch = response.data.match(/<link\s+rel="icon"\s+href="([^"]+)"\s*\/?>/)
		const faviconMatch2 = response.data.match(/<link\s+rel='icon'\s+href='([^"]+)'\s*\/?>/)

		if (faviconMatch && faviconMatch[1] && typeof faviconMatch[1] === "string") {
			metadata["favicon"] = faviconMatch[1]
		}

		if (faviconMatch2 && faviconMatch2[1] && typeof faviconMatch2[1] === "string") {
			metadata["favicon"] = faviconMatch2[1]
		}

		workerParseOGFromURLCache.set(url, metadata)

		return metadata
	} finally {
		parseOGFromURLMutex.release()
	}
}

export async function chatDisableMessageEmbed({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().disableMessageEmbed({ uuid })
}

export async function fetchAccount() {
	await waitForInitialization()

	return await SDK.user().account()
}

export async function fetchSettings() {
	await waitForInitialization()

	return await SDK.user().settings()
}

export async function uploadAvatar({ buffer }: { buffer: Buffer }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().uploadAvatar({ buffer })
}

export async function requestAccountData() {
	await waitForInitialization()

	return await SDK.user().gdpr()
}

export async function deleteAllVersionedFiles(): Promise<void> {
	await waitForInitialization()

	return await SDK.user().deleteAllVersionedFiles()
}

export async function deleteEverything(): Promise<void> {
	await waitForInitialization()

	return await SDK.user().deleteEverything()
}

export async function toggleFileVersioning({ enabled }: { enabled: boolean }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().versioning({ enabled })
}

export async function toggleLoginAlerts({ enabled }: { enabled: boolean }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().loginAlerts({ enabled })
}

export async function requestAccountDeletion({ twoFactorCode }: { twoFactorCode?: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().delete({ twoFactorCode })
}

export async function emptyTrash(): Promise<void> {
	await waitForInitialization()

	return await SDK.cloud().emptyTrash()
}

export async function uploadFilesToChatUploads({ files }: { files: File[] }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const base = await listDirectory({ uuid: SDK.config.baseFolderUUID!, onlyDirectories: true })
	let parentUUID = ""
	const baseFiltered = base.filter(item => item.type === "directory" && item.name.toLowerCase() === "chat uploads")

	if (baseFiltered.length === 1) {
		parentUUID = baseFiltered[0].uuid
	} else {
		parentUUID = (await createDirectory({ name: "Chat Uploads", parent: SDK.config.baseFolderUUID! })).uuid
	}

	const now = Date.now()

	return await promiseAllChunked(
		files.map(file =>
			uploadFile({
				file,
				parent: parentUUID,
				name: `${now}_${file.name}`
			})
		)
	)
}

export async function enablePublicLink({ type, uuid }: { type: "file" | "directory"; uuid: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.cloud().enablePublicLink({ type, uuid })
}

export async function editPublicLink({
	type,
	itemUUID,
	linkUUID,
	password,
	enableDownload,
	expiration
}: {
	type: "file" | "directory"
	itemUUID: string
	linkUUID?: string
	password?: string
	enableDownload?: boolean
	expiration: PublicLinkExpiration
}): Promise<void> {
	await waitForInitialization()

	return await SDK.cloud().editPublicLink({ type, itemUUID, linkUUID, password, enableDownload, expiration })
}

export async function disablePublicLink({
	type,
	itemUUID,
	linkUUID
}: {
	type: "file" | "directory"
	itemUUID: string
	linkUUID: string
}): Promise<void> {
	await waitForInitialization()

	if (type === "directory") {
		return await SDK.cloud().disablePublicLink({ type, itemUUID })
	}

	return await SDK.cloud().disablePublicLink({ type, itemUUID, linkUUID })
}

export async function filePublicLinkStatus({ uuid }: { uuid: string }): Promise<FileLinkStatusResponse> {
	return await SDK.cloud().publicLinkStatus({ type: "file", uuid })
}

export async function directoryPublicLinkStatus({ uuid }: { uuid: string }): Promise<{
	exists: boolean
	uuid: string
	key: string
	expiration: number
	expirationText: string
	downloadBtn: 0 | 1
	password: string | null
}> {
	await waitForInitialization()

	const status = await SDK.cloud().publicLinkStatus({ type: "directory", uuid })

	return {
		exists: status.exists,
		uuid: status.exists ? status.uuid : "",
		key: status.exists ? status.key : "",
		expiration: status.exists ? status.expiration : 0,
		expirationText: status.exists ? status.expirationText : "",
		downloadBtn: status.exists ? status.downloadBtn : 1,
		password: status.exists ? status.password : null
	}
}

export async function decryptDirectoryLinkKey({ key }: { key: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.crypto().decrypt().folderLinkKey({ metadata: key })
}

export async function stopSharingItem({ uuid, receiverId }: { uuid: string; receiverId: number }): Promise<void> {
	await waitForInitialization()

	return await SDK.cloud().stopSharingItem({ uuid, receiverId })
}

export async function removeSharedItem({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.cloud().removeSharedItem({ uuid })
}

export async function appearOffline({ enabled }: { enabled: boolean }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().appearOffline({ enabled })
}

export async function changeEmail({ email, password }: { email: string; password: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().changeEmail({ email, password })
}

export async function changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().changePassword({ currentPassword, newPassword })
}

export async function changeNickname({ nickname }: { nickname: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().updateNickname({ nickname })
}

export async function updatePersonalInformation({
	city,
	companyName,
	country,
	firstName,
	lastName,
	postalCode,
	street,
	streetNumber,
	vatId
}: {
	city?: string
	companyName?: string
	country?: string
	firstName?: string
	lastName?: string
	postalCode?: string
	street?: string
	streetNumber?: string
	vatId?: string
}): Promise<void> {
	await waitForInitialization()

	return await SDK.user().updatePersonalInformation({
		city,
		companyName,
		country,
		firstName,
		lastName,
		postalCode,
		street,
		streetNumber,
		vatId
	})
}

export async function updateDesktopLastActive({ timestamp }: { timestamp: number }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().updateDesktopLastActive({ timestamp })
}

export async function listEvents(params?: { timestamp?: number; filter?: "all" }): Promise<UserEvent[]> {
	await waitForInitialization()

	return await SDK.user().events(params)
}

export async function fetchEvent({ uuid }: { uuid: string }): Promise<UserEvent> {
	await waitForInitialization()

	return await SDK.user().event({ uuid })
}

export async function generateInvoice({ uuid }: { uuid: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.user().generateInvoice({ uuid })
}

export async function cancelSubscription({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().cancelSubscription({ uuid })
}

export async function enableTwoFactorAuthentication({ twoFactorCode }: { twoFactorCode: string }): Promise<string> {
	await waitForInitialization()

	return await SDK.user().enableTwoFactorAuthentication({ twoFactorCode })
}

export async function disableTwoFactorAuthentication({ twoFactorCode }: { twoFactorCode: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.user().disableTwoFactorAuthentication({ twoFactorCode })
}

export async function leaveChatConversation({ conversation }: { conversation: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.chats().leave({ conversation })
}

export async function workerCalculateThumbnailCacheUsage(): Promise<number> {
	await waitForInitialization()

	return calculateThumbnailCacheUsage()
}

export async function workerClearThumbnailCache(): Promise<void> {
	await waitForInitialization()

	return clearThumbnailCache()
}

export type CDNConfig = {
	maintenance: boolean
	readOnly: boolean
	announcements: CDNConfigAnnouncement[]
	pricing: CDNConfigPricing
}

export type CDNConfigAnnouncement = {
	uuid: string
	title: string
	message: string
	active: boolean
	timestamp: number
	platforms: string[]
}

export type CDNConfigPricing = {
	lifetimeEnabled: boolean
	saleEnabled: boolean
	plans: CDNConfigPlan[]
}

export type CDNConfigPlan = {
	termType: number
	id: number
	name: string
	cost: number
	sale: number
	storage: number
	popular: boolean
	term: string
}

export async function cdnConfig(): Promise<CDNConfig> {
	await waitForInitialization()

	return (
		await axios.get("https://cdn.filen.io/cfg.json", {
			timeout: 60000,
			responseType: "json"
		})
	).data
}

export async function createSubscription({ planId, paymentMethod }: { planId: number; paymentMethod: PaymentMethods }): Promise<string> {
	await waitForInitialization()

	return await SDK.user().createSubscription({ planId, paymentMethod })
}

export async function fileVersions({ uuid }: { uuid: string }): Promise<FileVersionsResponse> {
	await waitForInitialization()

	return await SDK.cloud().fileVersions({ uuid })
}

export async function restoreFileVersion({ uuid, currentUUID }: { uuid: string; currentUUID: string }): Promise<void> {
	await waitForInitialization()

	return await SDK.cloud().restoreFileVersion({ uuid, currentUUID })
}

export async function deleteFilePermanently({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	await SDK.cloud().deleteFile({
		uuid
	})
}
