import { getSDK } from "../sdk"
import {
	type FilenSDKConfig,
	type FileMetadata,
	type FolderMetadata,
	type PublicLinkExpiration,
	type CloudItemTree,
	type MetadataEncryptionVersion,
	PauseSignal
} from "@filen/sdk"
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
import {
	THUMBNAIL_VERSION,
	THUMBNAIL_QUALITY,
	THUMBNAIL_MAX_SIZE,
	REMOTE_CFG_NAME,
	DESKTOP_HTTP_SERVER_PORT,
	IS_DESKTOP
} from "@/constants"
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
import { type NoteHistory } from "@filen/sdk/dist/types/api/v3/notes/history"
import { type FileLinkPasswordResponse } from "@filen/sdk/dist/types/api/v3/file/link/password"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { type DirLinkContentDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/content"
import { type AuthInfoResponse } from "@filen/sdk/dist/types/api/v3/auth/info"
import { type UserProfileResponse } from "@filen/sdk/dist/types/api/v3/user/profile"
import { fileNameToThumbnailType, isFileStreamable } from "@/components/dialogs/previewDialog/utils"
import DOMPurify from "dompurify"
import { type DirExistsResponse } from "@filen/sdk/dist/types/api/v3/dir/exists"
import { type RemoteConfig } from "@/types"
import { initializeSDKWorkers } from "../sdkWorker"
import { type SDKWorkerToMainWorkerMessage } from "../sdkWorker/sdkWorker"

const parseOGFromURLMutex = new Semaphore(1)
const corsHeadMutex = new Semaphore(1)
let isInitialized = false
const pauseSignals: Record<string, PauseSignal> = {}
const abortControllers: Record<string, AbortController> = {}
const textEncoder = new TextEncoder()

// We setup an eventEmitter first here in case we are running in the main thread.
let postMessageToMain: (message: WorkerToMainMessage) => void = message => eventEmitter.emit("workerMessage", message)

eventEmitter.on("sdkWorkerMessage", (event: SDKWorkerToMainWorkerMessage) => {
	if (event.type === "uploadProgress") {
		postMessageToMain({
			type: "upload",
			data: {
				type: "progress",
				uuid: event.data.uuid,
				bytes: event.data.bytes,
				name: event.data.name,
				fileType: event.data.fileType
			}
		})
	}

	if (event.type === "downloadProgress") {
		postMessageToMain({
			type: "download",
			data: {
				type: "progress",
				uuid: event.data.uuid,
				bytes: event.data.bytes,
				name: event.data.name,
				fileType: event.data.fileType
			}
		})
	}
})

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

export async function initializeSDK(config: FilenSDKConfig): Promise<void> {
	config = {
		...config,
		connectToSocket: false,
		metadataCache: true
	}

	getSDK().init(config)

	const sdkWorkers = await initializeSDKWorkers(config)

	if (sdkWorkers) {
		getSDK().setSDKWorkers(sdkWorkers)
	}

	console.log("Worker SDK initialized")

	isInitialized = true
}

export async function setMessageHandler(callback: (message: WorkerToMainMessage) => void): Promise<void> {
	postMessageToMain = callback

	return
}

export async function encryptMetadata({
	metadata,
	key,
	version
}: {
	metadata: string
	key?: string
	version?: MetadataEncryptionVersion
}): Promise<string> {
	await waitForInitialization()

	return await getSDK().crypto().encrypt().metadata({
		metadata,
		key,
		version
	})
}

export async function decryptMetadata({ metadata, key }: { metadata: string; key: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().crypto().decrypt().metadata({
		metadata,
		key
	})
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
}): Promise<DirectorySizeResult> {
	await waitForInitialization()

	const cache = await getItem<DirectorySizeResult | null>("directorySize:" + uuid)

	if (cache) {
		return cache
	}

	const fetched = await directorySize({
		uuid,
		sharerId,
		receiverId,
		trash
	})

	return fetched
}

export async function listDirectory({ uuid, onlyDirectories }: { uuid: string; onlyDirectories?: boolean }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await getSDK().cloud().listDirectory({ uuid, onlyDirectories })
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: 0,
									receiverId: 0,
									trash: false
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

	const items = await getSDK().cloud().listDirectorySharedIn({ uuid })
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: item.sharerId ?? 0,
									receiverId: item.receiverId ?? 0,
									trash: false
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

	const items = await getSDK().cloud().listDirectorySharedOut({
		uuid,
		receiverId
	})
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: item.sharerId ?? 0,
									receiverId: item.receiverId ?? 0,
									trash: false
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

	const items = await getSDK().cloud().listFavorites()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: 0,
									receiverId: 0,
									trash: false
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

	const items = await getSDK().cloud().listPublicLinks()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: 0,
									receiverId: 0,
									trash: false
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

	const items = await getSDK().cloud().listRecents()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: 0,
									receiverId: 0,
									trash: false
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

	const items = await getSDK().cloud().listTrash()
	const driveItems: DriveCloudItem[] = await promiseAllChunked(
		items.map(
			item =>
				new Promise<DriveCloudItem>((resolve, reject) => {
					;(item.type === "directory"
						? new Promise<number>((resolve, reject) =>
								getDirectorySizeFromCacheOrFetch({
									uuid: item.uuid,
									sharerId: 0,
									receiverId: 0,
									trash: true
								})
									.then(result => resolve(result.size))
									.catch(reject)
							)
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

export async function downloadFile({
	item,
	fileHandle
}: {
	item: DriveCloudItem
	fileHandle: FileSystemFileHandle | WritableStream<Buffer>
}): Promise<void> {
	await waitForInitialization()

	if (item.type !== "file") {
		return
	}

	if (!pauseSignals[item.uuid]) {
		pauseSignals[item.uuid] = new PauseSignal()
	}

	if (!abortControllers[item.uuid]) {
		abortControllers[item.uuid] = new AbortController()
	}

	const writer =
		fileHandle instanceof WritableStream
			? fileHandle
			: await fileHandle.createWritable({
					keepExistingData: false
				})

	const stream = getSDK()
		.cloud()
		.downloadFileToReadableStream({
			uuid: item.uuid,
			bucket: item.bucket,
			region: item.region,
			version: item.version,
			size: item.size,
			chunks: item.chunks,
			key: item.key,
			pauseSignal: pauseSignals[item.uuid],
			abortSignal: abortControllers[item.uuid]?.signal,
			onProgressId: item.uuid,
			onQueued: () => {
				postMessageToMain({
					type: "download",
					data: {
						type: "queued",
						uuid: item.uuid,
						name: item.name,
						fileType: "file"
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
						size: item.size,
						fileType: "file"
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
						name: item.name,
						fileType: "file"
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
						size: item.size,
						fileType: "file"
					}
				})

				delete pauseSignals[item.uuid]
				delete abortControllers[item.uuid]
			},
			onError: err => {
				writer.abort(err).catch(console.error)

				if (err instanceof DOMException && err.name === "AbortError") {
					return
				}

				postMessageToMain({
					type: "download",
					data: {
						type: "error",
						uuid: item.uuid,
						err,
						name: item.name,
						size: item.size,
						fileType: "file"
					}
				})

				delete pauseSignals[item.uuid]
				delete abortControllers[item.uuid]
			}
		})

	await stream.pipeTo(writer).catch(console.error)
}

export async function uploadFile({
	file,
	parent,
	sharerId = 0,
	sharerEmail = "",
	receiverId = 0,
	receiverEmail = "",
	receivers = [],
	name,
	emitEvents = true
}: {
	file: File
	parent: string
	sharerId?: number
	sharerEmail?: string
	receiverId?: number
	receiverEmail?: string
	receivers?: CloudItemReceiver[]
	name?: string
	emitEvents?: boolean
}): Promise<DriveCloudItem> {
	await waitForInitialization()

	const fileName = name ? name : file.name
	const fileUUID = uuidv4()

	if (!pauseSignals[fileUUID]) {
		pauseSignals[fileUUID] = new PauseSignal()
	}

	if (!abortControllers[fileUUID]) {
		abortControllers[fileUUID] = new AbortController()
	}

	const item = await getSDK()
		.cloud()
		.uploadWebFile({
			file,
			parent,
			uuid: fileUUID,
			name: fileName,
			pauseSignal: pauseSignals[fileUUID],
			abortSignal: abortControllers[fileUUID]?.signal,
			onProgressId: fileUUID,
			onQueued: () => {
				if (!emitEvents) {
					return
				}

				postMessageToMain({
					type: "upload",
					data: {
						type: "queued",
						uuid: fileUUID,
						name: fileName,
						fileType: "file"
					}
				})
			},
			onStarted: () => {
				if (!emitEvents) {
					return
				}

				postMessageToMain({
					type: "upload",
					data: {
						type: "started",
						uuid: fileUUID,
						name: fileName,
						size: file.size,
						fileType: "file"
					}
				})
			},
			onProgress: transferred => {
				if (!emitEvents) {
					return
				}

				postMessageToMain({
					type: "upload",
					data: {
						type: "progress",
						uuid: fileUUID,
						bytes: transferred,
						name: fileName,
						fileType: "file"
					}
				})
			},
			onFinished: () => {
				if (!emitEvents) {
					return
				}

				postMessageToMain({
					type: "upload",
					data: {
						type: "finished",
						uuid: fileUUID,
						name: fileName,
						size: file.size,
						fileType: "file"
					}
				})

				delete pauseSignals[fileUUID]
				delete abortControllers[fileUUID]
			},
			onError: err => {
				if (!emitEvents) {
					return
				}

				if (err instanceof DOMException && err.name === "AbortError") {
					return
				}

				postMessageToMain({
					type: "upload",
					data: {
						type: "error",
						uuid: fileUUID,
						err,
						name: fileName,
						size: file.size,
						fileType: "file"
					}
				})

				delete pauseSignals[fileUUID]
				delete abortControllers[fileUUID]
			},
			onUploaded: async item => {
				if (item.type !== "file") {
					return
				}

				await generateThumbnailInsideWorker({
					item: {
						...item,
						sharerId: 0,
						sharerEmail: "",
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						receivers: [],
						size: item.size
					}
				}).catch(() => {})
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
	receivers = [],
	emitEvents = true,
	excludeDSStore = true
}: {
	files: { file: File; path: string }[]
	parent: string
	sharerId?: number
	sharerEmail?: string
	receiverId?: number
	receiverEmail?: string
	receivers?: CloudItemReceiver[]
	emitEvents?: boolean
	excludeDSStore?: boolean
}): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	if (excludeDSStore) {
		files = files.filter(file => file.file.name.toLowerCase().trim() !== ".ds_store")
	}

	if (files.length === 0) {
		throw new Error("Empty directory.")
	}

	const directoryId = `directory:${uuidv4()}`
	const items: DriveCloudItem[] = []
	let size = 0
	let name: string | null = null
	let didQueue = false
	let didStart = false
	let didError = false

	for (let i = 0; i < files.length; i++) {
		const file = files[i]

		if (!file) {
			continue
		}

		size += file.file.size

		const ex = file.path.split("/")

		if (!name && ex[0] && ex[0].length > 0) {
			name = ex[0].trim()
		}
	}

	if (!name) {
		name = "Directory"
	}

	if (!pauseSignals[directoryId]) {
		pauseSignals[directoryId] = new PauseSignal()
	}

	if (!abortControllers[directoryId]) {
		abortControllers[directoryId] = new AbortController()
	}

	try {
		await getSDK()
			.cloud()
			.uploadDirectoryFromWeb({
				files,
				parent,
				name,
				pauseSignal: pauseSignals[directoryId],
				abortSignal: abortControllers[directoryId]?.signal,
				onProgressId: directoryId,
				throwOnSingleFileUploadError: false,
				onQueued: () => {
					if (didQueue || !emitEvents) {
						return
					}

					didQueue = true

					postMessageToMain({
						type: "upload",
						data: {
							type: "queued",
							uuid: directoryId,
							name: name!,
							fileType: "directory"
						}
					})
				},
				onStarted: () => {
					if (didStart || !emitEvents) {
						return
					}

					didStart = true

					postMessageToMain({
						type: "upload",
						data: {
							type: "started",
							uuid: directoryId,
							name: name!,
							size,
							fileType: "directory"
						}
					})
				},
				onProgress: transferred => {
					if (!emitEvents) {
						return
					}

					postMessageToMain({
						type: "upload",
						data: {
							type: "progress",
							uuid: directoryId,
							bytes: transferred,
							name: name!,
							fileType: "directory"
						}
					})
				},
				onError: err => {
					if (err instanceof DOMException && err.name === "AbortError") {
						return
					}

					if (didError || !emitEvents) {
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
							size,
							fileType: "directory"
						}
					})

					delete pauseSignals[directoryId]
					delete abortControllers[directoryId]
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

					postMessageToMain({
						type: "upload",
						data: {
							type: "directoryProgress",
							uuid: directoryId,
							name: name!,
							created: 1,
							fileType: "directory"
						}
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

					if (item.type === "file") {
						await generateThumbnailInsideWorker({
							item: {
								...item,
								sharerId: 0,
								sharerEmail: "",
								receiverId: 0,
								receiverEmail: "",
								selected: false,
								receivers: [],
								size: item.size
							}
						}).catch(() => {})
					}
				}
			})

		if (emitEvents) {
			postMessageToMain({
				type: "upload",
				data: {
					type: "finished",
					uuid: directoryId,
					name: name!,
					size,
					fileType: "directory"
				}
			})
		}

		delete pauseSignals[directoryId]
		delete abortControllers[directoryId]

		return items
	} catch (e) {
		if (e instanceof DOMException && e.name === "AbortError") {
			return []
		}

		if (!didError && emitEvents) {
			didError = true

			const err = e as unknown as Error

			postMessageToMain({
				type: "upload",
				data: {
					type: "error",
					uuid: directoryId,
					err,
					name: name!,
					size,
					fileType: "directory"
				}
			})
		}

		throw e
	}
}

export const directorySizeRateLimit: Record<string, number> = {}

export type DirectorySizeResult = {
	size: number
	folders: number
	files: number
}

export async function directorySize({
	uuid,
	sharerId,
	receiverId,
	trash,
	linkUUID
}: {
	uuid: string
	sharerId?: number
	receiverId?: number
	trash?: boolean
	linkUUID?: string
}): Promise<DirectorySizeResult> {
	await waitForInitialization()

	const rateLimitKey = `${uuid}:${sharerId ?? 0}:${receiverId ?? 0}:${trash ?? false}:${linkUUID ?? ""}`
	const now = Date.now()

	if (directorySizeRateLimit[rateLimitKey] && now < directorySizeRateLimit[rateLimitKey]) {
		const cache = await getItem<DirectorySizeResult | null>("directorySize:" + uuid)

		if (cache) {
			return cache
		}
	}

	directorySizeRateLimit[rateLimitKey] = now + 30000

	const fetched = linkUUID
		? await getSDK().cloud().directorySizePublicLink({
				uuid,
				linkUUID
			})
		: await getSDK().cloud().directorySize({
				uuid,
				sharerId,
				receiverId,
				trash
			})

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
	linkKey,
	dontEmitQueuedEvent,
	id,
	name
}: {
	items: DriveCloudItemWithPath[]
	fileHandle: FileSystemFileHandle | WritableStream<Buffer>
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	dontEmitQueuedEvent?: boolean
	linkKey?: string
	id?: string
	name: string
}): Promise<void> {
	await waitForInitialization()

	const writer =
		fileHandle instanceof WritableStream
			? fileHandle
			: await fileHandle.createWritable({
					keepExistingData: false
				})

	const itemsWithPath: DriveCloudItemWithPath[] = []
	const zipWriter = new ZipWriter(writer)
	const treePromises: Promise<void>[] = []
	const directoryName = name
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
							linkUUID,
							linkKey
						})
							.then(tree => {
								for (const path in tree) {
									const treeItem = tree[path]

									if (!treeItem || treeItem.type !== "file") {
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
			await zipWriter.close().catch(console.error)
			await writer.abort().catch(console.error)

			postMessageToMain({
				type: "download",
				data: {
					type: "finished",
					uuid: directoryId,
					name: directoryName,
					size: directorySize,
					fileType: "directory"
				}
			})

			return
		}

		directorySize = itemsWithPath.reduce((prev, item) => prev + item.size, 0)

		if (!pauseSignals[directoryId]) {
			pauseSignals[directoryId] = new PauseSignal()
		}

		if (!abortControllers[directoryId]) {
			abortControllers[directoryId] = new AbortController()
		}

		const zipParentDirectoryName = directoryName.endsWith(".zip") ? directoryName.substring(0, directoryName.length - 4) : directoryName

		await promiseAllChunked(
			itemsWithPath
				.sort((a, b) => a.path.split("/").length - b.path.split("/").length)
				.map(async item => {
					if (item.type !== "file") {
						return
					}

					await new Promise<void>((resolve, reject) => {
						zipWriter
							.add(
								`${zipParentDirectoryName}/${item.path}`,
								getSDK()
									.cloud()
									.downloadFileToReadableStream({
										uuid: item.uuid,
										bucket: item.bucket,
										region: item.region,
										version: item.version,
										chunks: item.chunks,
										size: item.size,
										key: item.key,
										pauseSignal: pauseSignals[directoryId],
										abortSignal: abortControllers[directoryId]?.signal,
										onProgressId: directoryId,
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
													name: directoryName,
													fileType: "directory"
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
													size: directorySize,
													fileType: "directory"
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
													bytes: transferred,
													fileType: "directory"
												}
											})
										},
										onError: async err => {
											if (err instanceof DOMException && err.name === "AbortError") {
												return
											}

											postMessageToMain({
												type: "download",
												data: {
													type: "error",
													uuid: directoryId,
													name: directoryName,
													size: directorySize,
													err,
													fileType: "directory"
												}
											})

											delete pauseSignals[directoryId]
											delete abortControllers[directoryId]

											reject(err)
										}
									}),
								{
									lastModDate: new Date(item.lastModified),
									lastAccessDate: new Date(item.lastModified),
									creationDate: new Date(item.creation ?? item.lastModified),
									useWebWorkers: false
								}
							)
							.then(() => resolve())
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
				size: directorySize,
				fileType: "directory"
			}
		})

		delete pauseSignals[directoryId]
		delete abortControllers[directoryId]
	} catch (e) {
		await zipWriter.close().catch(console.error)
		await writer.abort(e).catch(console.error)

		if (e instanceof DOMException && e.name === "AbortError") {
			return
		}

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
					err,
					fileType: "directory"
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
	linkKey,
	skipCache
}: {
	uuid: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	skipCache?: boolean
	linkKey?: string
}) {
	await waitForInitialization()

	return await getSDK().cloud().getDirectoryTree({
		uuid,
		type,
		linkUUID,
		linkHasPassword,
		linkPassword,
		linkSalt,
		skipCache,
		linkKey
	})
}

export async function downloadDirectory({
	uuid,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	linkKey,
	fileHandle,
	name
}: {
	uuid: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkKey?: string
	linkSalt?: string
	fileHandle: FileSystemFileHandle | WritableStream<Buffer>
	name: string
}): Promise<void> {
	await waitForInitialization()

	const directoryId = uuidv4()
	const directoryName = name
	const items: DriveCloudItemWithPath[] = []

	postMessageToMain({
		type: "download",
		data: {
			type: "queued",
			uuid: directoryId,
			name: directoryName,
			fileType: "directory"
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
			linkSalt,
			linkKey
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
				size: 0,
				fileType: "directory"
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
				size: 0,
				fileType: "directory"
			}
		})

		return
	}

	for (const path in tree) {
		const item = tree[path]

		if (!item || item.type !== "file") {
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
		linkKey,
		dontEmitQueuedEvent: true,
		id: directoryId,
		name
	})
}

export async function moveItems({ items, parent }: { items: DriveCloudItem[]; parent: string }): Promise<void> {
	await waitForInitialization()

	await promiseAllChunked(
		items.map(item =>
			item.parent === parent
				? Promise.resolve()
				: item.type === "file"
					? getSDK()
							.cloud()
							.moveFile({
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
					: getSDK()
							.cloud()
							.moveDirectory({
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
				? getSDK().cloud().deleteFile({
						uuid: item.uuid
					})
				: getSDK().cloud().deleteDirectory({
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
				? getSDK().cloud().trashFile({
						uuid: item.uuid
					})
				: getSDK().cloud().trashDirectory({
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
				? getSDK().cloud().restoreFile({
						uuid: item.uuid
					})
				: getSDK().cloud().restoreDirectory({
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
					? getSDK().cloud().favoriteFile({
							uuid: item.uuid,
							favorite
						})
					: getSDK().cloud().favoriteDirectory({
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

	if (!pauseSignals[item.uuid]) {
		pauseSignals[item.uuid] = new PauseSignal()
	}

	if (!abortControllers[item.uuid]) {
		abortControllers[item.uuid] = new AbortController()
	}

	const stream = getSDK()
		.cloud()
		.downloadFileToReadableStream({
			uuid: item.uuid,
			bucket: item.bucket,
			region: item.region,
			chunks: item.chunks,
			version: item.version,
			size: item.size,
			key: item.key,
			start,
			end,
			pauseSignal: pauseSignals[item.uuid],
			abortSignal: abortControllers[item.uuid]?.signal,
			onProgressId: item.uuid,
			onQueued: () => {
				if (!emitEvents) {
					return
				}

				postMessageToMain({
					type: "download",
					data: {
						type: "queued",
						uuid: item.uuid,
						name: item.name,
						fileType: "file"
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
						size: item.size,
						fileType: "file"
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
						name: item.name,
						fileType: "file"
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
						size: item.size,
						fileType: "file"
					}
				})

				delete pauseSignals[item.uuid]
				delete abortControllers[item.uuid]
			},
			onError: err => {
				if (err instanceof DOMException && err.name === "AbortError") {
					return
				}

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
						size: item.size,
						fileType: "file"
					}
				})

				delete pauseSignals[item.uuid]
				delete abortControllers[item.uuid]
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

/**
 * Generate an image thumbnail. Works in both threads.
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem }} param0
 * @param {DriveCloudItem} param0.item
 * @returns {Promise<Blob>}
 */
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
	let thumbnailWidth = originalWidth
	let thumbnailHeight = originalHeight

	if (originalWidth > THUMBNAIL_MAX_SIZE || originalHeight > THUMBNAIL_MAX_SIZE) {
		const aspectRatio = originalWidth / originalHeight

		if (originalWidth > originalHeight) {
			thumbnailWidth = THUMBNAIL_MAX_SIZE
			thumbnailHeight = Math.round(THUMBNAIL_MAX_SIZE / aspectRatio)
		} else {
			thumbnailHeight = THUMBNAIL_MAX_SIZE
			thumbnailWidth = Math.round(THUMBNAIL_MAX_SIZE * aspectRatio)
		}
	}

	const offscreenCanvas = new OffscreenCanvas(thumbnailWidth, thumbnailHeight)
	const ctx = offscreenCanvas.getContext("2d")

	if (!ctx) {
		throw new Error("Could not create OffscreenCanvas")
	}

	ctx.clearRect(0, 0, thumbnailWidth, thumbnailHeight)
	ctx.fillStyle = "black"
	ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight)
	ctx.drawImage(imageBitmap, 0, 0, thumbnailWidth, thumbnailHeight)

	const blob = await offscreenCanvas.convertToBlob({
		type: "image/jpeg",
		quality: THUMBNAIL_QUALITY
	})

	await setItem<Blob>(dbKey, blob)

	return blob
}

/**
 * Generate a video thumbnail. Only works on the main thread due requiring a <video /> element.
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem }} param0
 * @param {DriveCloudItem} param0.item
 * @returns {Promise<Blob>}
 */
export async function generateVideoThumbnail({ item }: { item: DriveCloudItem }): Promise<Blob> {
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

	if (IS_DESKTOP) {
		const desktopHTTPServerOnline = await httpHealthCheck({
			url: `http://localhost:${DESKTOP_HTTP_SERVER_PORT}/ping`,
			expectedStatusCode: 200,
			method: "GET",
			timeout: 5000,
			expectedBodyText: "pong"
		})

		if (!desktopHTTPServerOnline) {
			throw new Error("[generateVideoThumbnail] HTTP server not available.")
		}
	} else {
		const serviceWorkerOnline = await httpHealthCheck({
			url: `${window.origin}/sw/ping`,
			expectedStatusCode: 200,
			method: "GET",
			timeout: 5000,
			expectedBodyText: "OK"
		})

		if (!serviceWorkerOnline) {
			throw new Error("[generateVideoThumbnail] Service worker not available.")
		}
	}

	if (!isFileStreamable(item.name, item.mime)) {
		throw new Error(`[generateVideoThumbnail] File not streamable (${item.name}).`)
	}

	const video = document.createElement("video")

	try {
		const fileBase64 = Buffer.from(
			JSON.stringify({
				name: item.name,
				mime: item.mime,
				size: item.size,
				uuid: item.uuid,
				bucket: item.bucket,
				key: item.key,
				version: item.version,
				chunks: item.chunks,
				region: item.region
			}),
			"utf-8"
		).toString("base64")

		const blob = await new Promise<Blob>((resolve, reject) => {
			video.crossOrigin = "anonymous"
			video.src = !IS_DESKTOP
				? `${window.location.origin}/sw/stream?file=${encodeURIComponent(fileBase64)}#t=0,5`
				: `http://localhost:${DESKTOP_HTTP_SERVER_PORT}/stream?file=${encodeURIComponent(fileBase64)}#t=0,5`

			video.onerror = e => {
				reject(e)
			}

			video.onloadedmetadata = () => {
				if (video.duration < 1) {
					reject(new Error("Video is too short to generate thumbnail"))

					return
				}

				video.currentTime = video.duration >= 3 ? 3 : 1
			}

			video.requestVideoFrameCallback(() => {
				const originalWidth = video.videoWidth
				const originalHeight = video.videoHeight
				const thumbnailWidth = THUMBNAIL_MAX_SIZE
				const thumbnailHeight = THUMBNAIL_MAX_SIZE
				const videoAspectRatio = originalWidth / originalHeight
				const canvasAspectRatio = thumbnailWidth / thumbnailHeight
				let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number

				if (videoAspectRatio > canvasAspectRatio) {
					drawWidth = originalHeight * canvasAspectRatio
					drawHeight = originalHeight
					offsetX = (originalWidth - drawWidth) / 2
					offsetY = 0
				} else {
					drawWidth = originalWidth
					drawHeight = originalWidth / canvasAspectRatio
					offsetX = 0
					offsetY = (originalHeight - drawHeight) / 2
				}

				const canvas = document.createElement("canvas")
				const ctx = canvas.getContext("2d")

				canvas.width = thumbnailWidth
				canvas.height = thumbnailHeight

				if (!ctx) {
					reject(new Error("Could not create canvas"))

					return
				}

				ctx.fillStyle = "black"
				ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight)
				ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight, 0, 0, thumbnailWidth, thumbnailHeight)

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

			video.load()
		})

		await setItem<Blob>(dbKey, blob)

		return blob
	} finally {
		video.remove()
	}
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
	const viewport = page.getViewport({ scale: 1 })
	const canvas = document.createElement("canvas")
	const ctx = canvas.getContext("2d")

	canvas.width = viewport.width
	canvas.height = viewport.height

	if (!ctx) {
		throw new Error("Could not create canvas")
	}

	ctx.clearRect(0, 0, viewport.width, viewport.height)

	await page.render({
		canvasContext: ctx,
		viewport
	}).promise

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

	await (item.type === "file"
		? getSDK()
				.cloud()
				.renameFile({
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
		: getSDK().cloud().renameDirectory({
				uuid: item.uuid,
				name
			}))

	if (item.type === "directory") {
		await setItem(`directoryUUIDToName:${item.uuid}`, name)
	}
}

export async function directoryExists({ parent, name }: { parent: string; name: string }): Promise<DirExistsResponse> {
	await waitForInitialization()

	return await getSDK().cloud().directoryExists({ name, parent })
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

	const uuid = await getSDK().cloud().createDirectory({
		name,
		parent
	})

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

	await getSDK()
		.cloud()
		.shareItemsToUser({
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
				postMessageToMain({
					type: "shareProgress",
					done,
					total: items.length,
					requestUUID
				})
			}
		})
}

export async function listNotes(): Promise<Note[]> {
	await waitForInitialization()

	return await getSDK().notes().all()
}

export async function fetchNoteContent({ uuid }: { uuid: string }): Promise<{
	content: string
	type: NoteType
	editedTimestamp: number
	editorId: number
	preview: string
}> {
	await waitForInitialization()

	return await getSDK().notes().content({ uuid })
}

export async function editNoteTitle({ uuid, title }: { uuid: string; title: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().editTitle({
		uuid,
		title
	})
}

export async function editNoteContent({ uuid, content, type }: { uuid: string; content: string; type: NoteType }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().edit({
		uuid,
		content,
		type
	})
}

export async function createNote(): Promise<{ uuid: string; title: string }> {
	const title = simpleDate(Date.now())
	const uuid = await getSDK().notes().create({ title })

	return {
		title,
		uuid
	}
}

export async function trashNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().trash({ uuid })
}

export async function deleteNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().delete({ uuid })
}

export async function pinNote({ uuid, pin }: { uuid: string; pin: boolean }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().pin({
		uuid,
		pin
	})
}

export async function favoriteNote({ uuid, favorite }: { uuid: string; favorite: boolean }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().favorite({
		uuid,
		favorite
	})
}

export async function duplicateNote({ uuid }: { uuid: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().notes().duplicate({ uuid })
}

export async function listNotesTags(): Promise<NoteTag[]> {
	await waitForInitialization()

	return await getSDK().notes().tags()
}

export async function createNotesTag({ name }: { name: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().notes().createTag({ name })
}

export async function changeNoteType({ uuid, type }: { uuid: string; type: NoteType }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().changeType({
		uuid,
		newType: type
	})
}

export async function restoreNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().restore({ uuid })
}

export async function archiveNote({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().archive({ uuid })
}

export async function favoriteNotesTag({ uuid, favorite }: { uuid: string; favorite: boolean }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().tagFavorite({
		uuid,
		favorite
	})
}

export async function deleteNotesTag({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().deleteTag({ uuid })
}

export async function renameNotesTag({ uuid, name }: { uuid: string; name: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().renameTag({
		uuid,
		name
	})
}

export async function tagNote({ uuid, tag }: { uuid: string; tag: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().tag({
		uuid,
		tag
	})
}

export async function untagNote({ uuid, tag }: { uuid: string; tag: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().untag({
		uuid,
		tag
	})
}

export async function listChatsConversations(): Promise<ChatConversation[]> {
	await waitForInitialization()

	return await getSDK().chats().conversations()
}

export async function fetchChatsConversationsMessages({ uuid, timestamp }: { uuid: string; timestamp?: number }): Promise<ChatMessage[]> {
	await waitForInitialization()

	return await getSDK()
		.chats()
		.messages({
			conversation: uuid,
			timestamp: timestamp ? timestamp : Date.now() + 3600000
		})
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

	return await getSDK().chats().sendMessage({
		conversation,
		message,
		replyTo,
		uuid
	})
}

export async function sendChatTyping({ conversation, type }: { conversation: string; type: ChatTypingType }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().sendTyping({
		conversation,
		type
	})
}

export async function chatKey({ conversation }: { conversation: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().chats().chatKey({ conversation })
}

export async function noteKey({ uuid }: { uuid: string }): Promise<string> {
	return await getSDK().notes().noteKey({ uuid })
}

export async function decryptChatMessage({ message, key }: { message: string; key: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().crypto().decrypt().chatMessage({
		message,
		key
	})
}

export async function chatLastFocus(): Promise<ChatLastFocusValues[]> {
	await waitForInitialization()

	return await getSDK().chats().lastFocus()
}

export async function chatUpdateLastFocus({ values }: { values: ChatLastFocusValues[] }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().updateLastFocus({ values })
}

export async function chatDeleteMessage({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().deleteMessage({ uuid })
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

	return await getSDK().chats().editMessage({
		uuid,
		conversation,
		message
	})
}

export async function chatEditConversationName({ conversation, name }: { conversation: string; name: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().editConversationName({
		conversation,
		name
	})
}

export async function deleteChatConversation({ conversation }: { conversation: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().delete({ conversation })
}

export async function chatRemoveParticipant({ conversation, userId }: { conversation: string; userId: number }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().removeParticipant({
		conversation,
		userId
	})
}

export async function decryptFileMetadata({ metadata }: { metadata: string }): Promise<FileMetadata> {
	await waitForInitialization()

	return await getSDK().crypto().decrypt().fileMetadata({ metadata })
}

export async function decryptFolderMetadata({ metadata }: { metadata: string }): Promise<FolderMetadata> {
	await waitForInitialization()

	return await getSDK().crypto().decrypt().folderMetadata({ metadata })
}

export async function changeDirectoryColor({ color, uuid }: { color: string; uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().cloud().changeDirectoryColor({
		uuid,
		color
	})
}

export async function chatConversationOnline({ conversation }: { conversation: string }): Promise<ChatConversationsOnlineUser[]> {
	await waitForInitialization()

	return await getSDK().chats().conversationOnline({ conversation })
}

export async function listContacts(): Promise<Contact[]> {
	await waitForInitialization()

	return await getSDK().contacts().all()
}

export async function chatConversationUnreadCount({ conversation }: { conversation: string }): Promise<number> {
	await waitForInitialization()

	return await getSDK().chats().conversationUnreadCount({ conversation })
}

export async function chatMarkConversationAsRead({ conversation }: { conversation: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().markConversationAsRead({ conversation })
}

export async function chatsUnreadCount(): Promise<number> {
	await waitForInitialization()

	return await getSDK().chats().unread()
}

export async function listContactsRequestsIn(): Promise<ContactRequest[]> {
	await waitForInitialization()

	return await getSDK().contacts().incomingRequests()
}

export async function listContactsRequestsOut(): Promise<ContactRequest[]> {
	await waitForInitialization()

	return await getSDK().contacts().outgoingRequests()
}

export async function listBlockedContacts(): Promise<BlockedContact[]> {
	await waitForInitialization()

	return await getSDK().contacts().blocked()
}

export async function removeContact({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().remove({ uuid })
}

export async function blockUser({ email }: { email: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().block({ email })
}

export async function unblockUser({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().unblock({ uuid })
}

export async function contactsRequestAccept({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().acceptRequest({ uuid })
}

export async function contactsRequestDeny({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().denyRequest({ uuid })
}

export async function contactsRequestRemove({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().deleteOutgoingRequest({ uuid })
}

export async function contactsRequestSend({ email }: { email: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().contacts().sendRequest({ email })
}

export async function contactsRequestInCount(): Promise<number> {
	await waitForInitialization()

	return await getSDK().contacts().incomingRequestsCount()
}

export async function createChatConversation({ contacts }: { contacts: Contact[] }): Promise<string> {
	await waitForInitialization()

	return await getSDK().chats().create({ contacts })
}

export async function fetchUserAccount(): Promise<UserAccountResponse> {
	await waitForInitialization()

	return await getSDK().user().account()
}

export async function chatConversationAddParticipant({ conversation, contact }: { conversation: string; contact: Contact }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().addParticipant({
		conversation,
		contact
	})
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

			if (response.status !== 200) {
				throw new Error("Invalid response status code.")
			}

			if (!response.headers || typeof response.headers["content-type"] !== "string") {
				throw new Error("Response type is not string: " + url)
			}

			workerCorsHeadCache.set(url, response.headers as Record<string, string>)

			return response.headers as Record<string, string>
		} catch {
			// Noop
		}

		const response = await axios.get("https://corsproxy.io/?" + encodeURIComponent(url), {
			timeout: 15000
		})

		if (response.status !== 200) {
			throw new Error("Invalid response status code.")
		}

		if (!response.headers || typeof response.headers["content-type"] !== "string") {
			throw new Error("Response type is not string: " + url)
		}

		workerCorsHeadCache.set(url, response.headers as Record<string, string>)

		return response.headers as Record<string, string>
	} finally {
		corsHeadMutex.release()
	}
}

export async function corsGet(url: string): Promise<AxiosResponse> {
	await waitForInitialization()

	try {
		const response = await axios.get(url, {
			timeout: 15000
		})

		if (response.status !== 200) {
			throw new Error("Invalid response status code.")
		}

		if (!response.headers || typeof response.headers["content-type"] !== "string") {
			throw new Error("Response content-type is not string: " + url)
		}

		return response
	} catch {
		// Noop
	}

	const response = await axios.get("https://corsproxy.io/?" + encodeURIComponent(url), {
		timeout: 15000
	})

	if (response.status !== 200) {
		throw new Error("Invalid response status code.")
	}

	if (!response.headers || typeof response.headers["content-type"] !== "string") {
		throw new Error("Response content-type is not string: " + url)
	}

	return response
}

export async function parseOGFromURL(url: string): Promise<Record<string, string>> {
	await waitForInitialization()

	await parseOGFromURLMutex.acquire()

	try {
		if (workerParseOGFromURLCache.has(url)) {
			return workerParseOGFromURLCache.get(url)!
		}

		const response = await corsGet(url)

		if (
			typeof response.headers["content-type"] !== "string" ||
			response.headers["content-type"].split(";")[0]?.trim() !== "text/html"
		) {
			throw new Error("Response content-type is not text/html: " + url)
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

	return await getSDK().chats().disableMessageEmbed({ uuid })
}

export async function fetchAccount() {
	await waitForInitialization()

	return await getSDK().user().account()
}

export async function fetchSettings() {
	await waitForInitialization()

	return await getSDK().user().settings()
}

export async function uploadAvatar({ arrayBuffer }: { arrayBuffer: ArrayBuffer }): Promise<void> {
	await waitForInitialization()

	return await getSDK()
		.user()
		.uploadAvatar({ buffer: Buffer.from(arrayBuffer) })
}

export async function requestAccountData() {
	await waitForInitialization()

	return await getSDK().user().gdpr()
}

export async function deleteAllVersionedFiles(): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().deleteAllVersionedFiles()
}

export async function deleteEverything(): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().deleteEverything()
}

export async function toggleFileVersioning({ enabled }: { enabled: boolean }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().versioning({ enabled })
}

export async function toggleLoginAlerts({ enabled }: { enabled: boolean }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().loginAlerts({ enabled })
}

export async function requestAccountDeletion({ twoFactorCode }: { twoFactorCode?: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().delete({ twoFactorCode })
}

export async function emptyTrash(): Promise<void> {
	await waitForInitialization()

	return await getSDK().cloud().emptyTrash()
}

export async function uploadFilesToChatUploads({ files }: { files: File[] }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const base = await listDirectory({
		uuid: getSDK().config.baseFolderUUID!,
		onlyDirectories: true
	})
	let parentUUID = ""
	const baseFiltered = base.filter(item => item.type === "directory" && item.name.toLowerCase().trim() === "chat uploads")

	if (baseFiltered.length === 1 && baseFiltered[0]) {
		parentUUID = baseFiltered[0].uuid
	} else {
		parentUUID = (
			await createDirectory({
				name: "Chat Uploads",
				parent: getSDK().config.baseFolderUUID!
			})
		).uuid
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

	return await getSDK()
		.cloud()
		.enablePublicLink({
			type,
			uuid,
			onProgress: (done, total) => {
				postMessageToMain({
					type: "publicLinkProgress",
					done,
					total,
					uuid
				})
			}
		})
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

	return await getSDK().cloud().editPublicLink({
		type,
		itemUUID,
		linkUUID,
		password,
		enableDownload,
		expiration
	})
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
		return await getSDK().cloud().disablePublicLink({
			type,
			itemUUID
		})
	}

	return await getSDK().cloud().disablePublicLink({
		type,
		itemUUID,
		linkUUID
	})
}

export async function filePublicLinkStatus({ uuid }: { uuid: string }): Promise<FileLinkStatusResponse> {
	return await getSDK().cloud().publicLinkStatus({
		type: "file",
		uuid
	})
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

	const status = await getSDK().cloud().publicLinkStatus({
		type: "directory",
		uuid
	})

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

	return await getSDK().crypto().decrypt().folderLinkKey({
		metadata: key
	})
}

export async function stopSharingItem({ uuid, receiverId }: { uuid: string; receiverId: number }): Promise<void> {
	await waitForInitialization()

	return await getSDK().cloud().stopSharingItem({
		uuid,
		receiverId
	})
}

export async function removeSharedItem({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().cloud().removeSharedItem({ uuid })
}

export async function appearOffline({ enabled }: { enabled: boolean }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().appearOffline({ enabled })
}

export async function changeEmail({ email, password }: { email: string; password: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().changeEmail({
		email,
		password
	})
}

export async function changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().user().changePassword({
		currentPassword,
		newPassword
	})
}

export async function changeNickname({ nickname }: { nickname: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().updateNickname({ nickname })
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

	return await getSDK().user().updatePersonalInformation({
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

	return await getSDK().user().updateDesktopLastActive({ timestamp })
}

export async function listEvents(params?: { timestamp?: number; filter?: "all" }): Promise<UserEvent[]> {
	await waitForInitialization()

	return await getSDK().user().events(params)
}

export async function fetchEvent({ uuid }: { uuid: string }): Promise<UserEvent> {
	await waitForInitialization()

	return await getSDK().user().event({ uuid })
}

export async function generateInvoice({ uuid }: { uuid: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().user().generateInvoice({ uuid })
}

export async function cancelSubscription({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().cancelSubscription({ uuid })
}

export async function enableTwoFactorAuthentication({ twoFactorCode }: { twoFactorCode: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().user().enableTwoFactorAuthentication({ twoFactorCode })
}

export async function disableTwoFactorAuthentication({ twoFactorCode }: { twoFactorCode: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().disableTwoFactorAuthentication({ twoFactorCode })
}

export async function leaveChatConversation({ conversation }: { conversation: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().chats().leave({ conversation })
}

export async function workerCalculateThumbnailCacheUsage(): Promise<number> {
	await waitForInitialization()

	return calculateThumbnailCacheUsage()
}

export async function workerClearThumbnailCache(): Promise<void> {
	await waitForInitialization()

	return clearThumbnailCache()
}

export async function cdnConfig(): Promise<RemoteConfig> {
	await waitForInitialization()

	const response = await axios.get("https://cdn.filen.io/" + REMOTE_CFG_NAME + "?" + Date.now(), {
		timeout: 60000,
		responseType: "json",
		method: "GET"
	})

	if (response.status !== 200) {
		throw new Error("Failed to fetch remote config")
	}

	return response.data as RemoteConfig
}

export async function createSubscription({ planId, paymentMethod }: { planId: number; paymentMethod: PaymentMethods }): Promise<string> {
	await waitForInitialization()

	return await getSDK().user().createSubscription({
		planId,
		paymentMethod
	})
}

export async function fileVersions({ uuid }: { uuid: string }): Promise<FileVersionsResponse> {
	await waitForInitialization()

	return await getSDK().cloud().fileVersions({ uuid })
}

export async function restoreFileVersion({ uuid, currentUUID }: { uuid: string; currentUUID: string }): Promise<void> {
	await waitForInitialization()

	return await getSDK().cloud().restoreFileVersion({
		uuid,
		currentUUID
	})
}

export async function deleteFilePermanently({ uuid }: { uuid: string }): Promise<void> {
	await waitForInitialization()

	await getSDK().cloud().deleteFile({
		uuid
	})
}

export async function noteHistory({ uuid }: { uuid: string }): Promise<NoteHistory[]> {
	await waitForInitialization()

	return await getSDK().notes().history({ uuid })
}

export async function restoreNoteHistory({ uuid, id }: { uuid: string; id: number }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().restoreHistory({
		uuid,
		id
	})
}

export async function removeNoteParticipant({ uuid, userId }: { uuid: string; userId: number }): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().removeParticipant({
		uuid,
		userId
	})
}

export async function userPublicKey({ email }: { email: string }): Promise<string> {
	await waitForInitialization()

	return await getSDK().user().publicKey({ email })
}

export async function addNoteParticipant({
	uuid,
	contactUUID,
	permissionsWrite,
	publicKey
}: {
	uuid: string
	contactUUID: string
	permissionsWrite: boolean
	publicKey: string
}): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().addParticipant({
		uuid,
		contactUUID,
		permissionsWrite,
		publicKey
	})
}

export async function noteParticipantPermissions({
	uuid,
	permissionsWrite,
	userId
}: {
	uuid: string
	permissionsWrite: boolean
	userId: number
}): Promise<void> {
	await waitForInitialization()

	return await getSDK().notes().participantPermissions({
		uuid,
		permissionsWrite,
		userId
	})
}

export async function pausePauseSignal({ id }: { id: string }): Promise<void> {
	await waitForInitialization()

	if (!pauseSignals[id] || pauseSignals[id].isPaused()) {
		return
	}

	pauseSignals[id].pause()
}

export async function resumePauseSignal({ id }: { id: string }): Promise<void> {
	await waitForInitialization()

	if (!pauseSignals[id] || !pauseSignals[id].isPaused()) {
		return
	}

	pauseSignals[id].resume()
}

export async function abortAbortSignal({ id }: { id: string }): Promise<void> {
	await waitForInitialization()

	if (!abortControllers[id] || abortControllers[id].signal.aborted) {
		return
	}

	abortControllers[id].abort()

	delete abortControllers[id]
	delete pauseSignals[id]
}

export async function filePublicLinkHasPassword({ uuid }: { uuid: string }): Promise<FileLinkPasswordResponse> {
	await waitForInitialization()

	return await getSDK().cloud().filePublicLinkHasPassword({ uuid })
}

export async function directoryPublicLinkInfo({ uuid, key }: { uuid: string; key: string }): Promise<DirLinkInfoDecryptedResponse> {
	await waitForInitialization()

	return await getSDK().cloud().directoryPublicLinkInfo({
		uuid,
		key
	})
}

export async function filePublicLinkInfo({
	uuid,
	password,
	key,
	salt
}: {
	uuid: string
	password?: string
	key: string
	salt?: string
}): Promise<Omit<FileLinkInfoResponse, "size"> & { size: number }> {
	await waitForInitialization()

	return await getSDK().cloud().filePublicLinkInfo({
		uuid,
		password,
		key,
		salt
	})
}

export async function directoryPublicLinkContent({
	uuid,
	parent,
	password,
	salt,
	key
}: {
	uuid: string
	parent: string
	password?: string
	salt?: string
	key: string
}): Promise<DirLinkContentDecryptedResponse & { directorySize: Record<string, number> }> {
	await waitForInitialization()

	const content = await getSDK().cloud().directoryPublicLinkContent({
		uuid,
		parent,
		password,
		salt,
		key
	})

	return {
		...content,
		directorySize: (
			await promiseAllChunked(
				content.folders.map(
					folder =>
						new Promise<[string, number]>((resolve, reject) => {
							directorySize({
								uuid: folder.uuid,
								receiverId: 0,
								trash: false,
								sharerId: 0,
								linkUUID: uuid
							})
								.then(({ size }) => {
									resolve([folder.uuid, size])
								})
								.catch(reject)
						})
				)
			)
		).reduce(
			(prev, current) => ({
				...prev,
				[current[0]]: current[1]
			}),
			{}
		)
	}
}

export async function authInfo({ email }: { email: string }): Promise<AuthInfoResponse> {
	await waitForInitialization()

	return await getSDK().api(3).auth().info({ email })
}

export async function userProfile({ id }: { id: number }): Promise<UserProfileResponse> {
	await waitForInitialization()

	return await getSDK().api(3).user().profile({ id })
}

export async function generateThumbnailInsideWorker({ item }: { item: DriveCloudItem }): Promise<void> {
	await waitForInitialization()

	if (item.type !== "file") {
		throw new Error("Item not of type file.")
	}

	const thumbnailType = fileNameToThumbnailType(item.name)
	const dbKey = `thumbnail:${item.uuid}:${THUMBNAIL_VERSION}`

	if (thumbnailType === "image") {
		const blob = await generateImageThumbnail({ item })

		await setItem(dbKey, blob)

		return
	}
}

export async function didExportMasterKeys(): Promise<void> {
	await waitForInitialization()

	return await getSDK().user().didExportMasterKeys()
}

export const sanitizeSVG = (file: File): Promise<File> => {
	return new Promise<File>((resolve, reject) => {
		if (!DOMPurify.isSupported) {
			reject(new Error("SVG sanitization not supported"))

			return
		}

		const reader = new FileReader()

		reader.onload = () => {
			try {
				const svgText = reader.result

				if (!svgText) {
					reject(new Error("sanitizeSVG: empty text"))

					return
				}

				if (typeof svgText !== "string") {
					reject(new Error("sanitizeSVG: no text"))

					return
				}

				const sanitized = DOMPurify.sanitize(svgText)

				if (sanitized.length <= 0) {
					reject(new Error("sanitizeSVG: sanitization failed"))

					return
				}

				resolve(
					new File([textEncoder.encode(sanitized)], file.name, {
						type: file.type,
						lastModified: file.lastModified
					})
				)
			} catch (e) {
				reject(e)
			}
		}

		reader.onerror = reject

		reader.readAsText(file)
	})
}

export async function pingAPI(): Promise<boolean> {
	const abortController = new AbortController()

	const timeout = setTimeout(() => {
		abortController.abort()
	}, 170000)

	try {
		const response = await axios({
			url: "https://gateway.filen.io",
			timeout: 170000,
			method: "HEAD",
			validateStatus: () => true,
			signal: abortController.signal
		})

		return response.status === 200
	} catch {
		return false
	} finally {
		clearTimeout(timeout)
	}
}

export async function httpHealthCheck({
	url,
	method = "GET",
	expectedStatusCode = 200,
	timeout = 5000,
	expectedBodyText
}: {
	url: string
	expectedStatusCode?: number
	method?: "GET" | "POST" | "HEAD"
	timeout?: number
	expectedBodyText?: string
}): Promise<boolean> {
	const abortController = new AbortController()

	const timeouter = setTimeout(() => {
		abortController.abort()
	}, timeout)

	try {
		const response = await axios({
			url,
			timeout,
			method,
			signal: abortController.signal,
			responseType: expectedBodyText ? "text" : undefined,
			validateStatus: () => true
		})

		clearTimeout(timeouter)

		if (!expectedBodyText) {
			return response.status === expectedStatusCode
		}

		return response.status === expectedStatusCode && typeof response.data === "string" && expectedBodyText === response.data
	} catch (e) {
		clearTimeout(timeouter)

		return false
	}
}

export async function terminate(): Promise<void> {
	self.close()
}
