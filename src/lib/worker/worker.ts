import SDK from "../sdk"
import { type FilenSDKConfig, type FileMetadata, type FolderMetadata } from "@filen/sdk"
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

let isInitialized = false
// We setup an eventEmitter first here in case we are running in the main thread.
let postMessageToMain: (message: WorkerToMainMessage) => void = message => eventEmitter.emit("workerMessage", message)

export async function waitForInitialization(): Promise<void> {
	// Only check for init if we are running inside a webworker.
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

export async function setMessageHandler(callback: (message: WorkerToMainMessage) => void): Promise<void> {
	postMessageToMain = callback

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

export async function listDirectory({ uuid, onlyDirectories }: { uuid: string; onlyDirectories?: boolean }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectory({ uuid, onlyDirectories })
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return driveItems
}

export async function listDirectorySharedIn({ uuid }: { uuid: string }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectorySharedIn({ uuid })
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push(
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
						favorited: false
					}
		)

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return driveItems
}

export async function listDirectorySharedOut({ uuid, receiverId }: { uuid: string; receiverId?: number }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectorySharedOut({ uuid, receiverId })
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push(
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
						favorited: false
					}
		)

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return driveItems
}

export async function listFavorites(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listFavorites()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return driveItems
}

export async function listPublicLinks(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listPublicLinks()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return driveItems
}

export async function listRecents(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listRecents()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return driveItems
}

export async function listTrash(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listTrash()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			setItem(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

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
					name: item.name,
					size: item.size
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
					name: item.name,
					size: item.size
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
	receivers = []
}: {
	file: File
	parent: string
	sharerId?: number
	sharerEmail?: string
	receiverId?: number
	receiverEmail?: string
	receivers?: CloudItemReceiver[]
}): Promise<DriveCloudItem> {
	await waitForInitialization()

	const fileId = `${file.name}:${file.size}:${file.type}:${file.lastModified}:${file.webkitRelativePath}`

	const item = await SDK.cloud().uploadWebFile({
		file,
		parent,
		name: file.name,
		onQueued: () => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "queued",
					uuid: fileId,
					name: file.name,
					size: file.size
				}
			})
		},
		onStarted: () => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "started",
					uuid: fileId,
					name: file.name,
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
					name: file.name,
					size: file.size
				}
			})
		},
		onFinished: () => {
			postMessageToMain({
				type: "upload",
				data: {
					type: "finished",
					uuid: fileId,
					name: file.name,
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
					name: file.name,
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
						name: name!,
						size
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
						name: name!,
						size
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

	return await SDK.cloud().directorySize({ uuid, sharerId, receiverId, trash })
}

export async function downloadMultipleFilesAndDirectoriesAsZip({
	items,
	fileHandle
}: {
	items: DriveCloudItem[]
	fileHandle: FileSystemFileHandle
}): Promise<void> {
	await waitForInitialization()

	const itemsWithPath: DriveCloudItemWithPath[] = []
	const writer = await fileHandle.createWritable()
	const zipWriter = new ZipWriter(writer, {
		level: 0
	})
	const treePromises: Promise<void>[] = []
	const directoryName = fileHandle.name
	const directorySize = items.reduce((prev, item) => prev + item.size, 0)
	const directoryId = await SDK.crypto().utils.hashFn({ input: items.reduce((prev, item) => prev + item.uuid, "") })
	let didQueue = false
	let didStart = false
	let didError = false

	try {
		for (const item of items) {
			if (item.type === "directory") {
				treePromises.push(
					new Promise((resolve, reject) => {
						getDirectoryTree({ uuid: item.uuid })
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
				itemsWithPath.push({ ...item, path: item.name })
			}
		}

		await promiseAllChunked(treePromises)

		if (itemsWithPath.length === 0) {
			return
		}

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
										name: directoryName,
										size: directorySize
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
										size: directorySize,
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
	return await SDK.cloud().getDirectoryTree({ uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt, skipCache })
}

export async function downloadDirectory({
	uuid,
	name,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	fileHandle
}: {
	uuid: string
	name: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	fileHandle: FileSystemFileHandle
}): Promise<void> {
	const tree = await getDirectoryTree({ uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt })
	const items: DriveCloudItemWithPath[] = []

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
			path: `${name}/${path.startsWith("/") ? path.slice(1) : path}`,
			rm: ""
		})
	}

	if (items.length === 0) {
		return
	}

	await downloadMultipleFilesAndDirectoriesAsZip({ items, fileHandle })
}

export async function moveItems({ items, parent }: { items: DriveCloudItem[]; parent: string }): Promise<void> {
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
					name: item.name,
					size: item.size
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
					name: item.name,
					size: item.size
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
	return await SDK.notes().all()
}

export async function fetchNoteContent({ uuid }: { uuid: string }): Promise<{
	content: string
	type: NoteType
	editedTimestamp: number
	editorId: number
	preview: string
}> {
	return await SDK.notes().content({ uuid })
}

export async function editNoteTitle({ uuid, title }: { uuid: string; title: string }): Promise<void> {
	return await SDK.notes().editTitle({ uuid, title })
}

export async function editNoteContent({ uuid, content, type }: { uuid: string; content: string; type: NoteType }): Promise<void> {
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
	return await SDK.notes().trash({ uuid })
}

export async function deleteNote({ uuid }: { uuid: string }): Promise<void> {
	return await SDK.notes().delete({ uuid })
}

export async function pinNote({ uuid, pin }: { uuid: string; pin: boolean }): Promise<void> {
	return await SDK.notes().pin({ uuid, pin })
}

export async function favoriteNote({ uuid, favorite }: { uuid: string; favorite: boolean }): Promise<void> {
	return await SDK.notes().favorite({ uuid, favorite })
}

export async function duplicateNote({ uuid }: { uuid: string }): Promise<string> {
	return await SDK.notes().duplicate({ uuid })
}

export async function listNotesTags(): Promise<NoteTag[]> {
	return await SDK.notes().tags()
}

export async function createNotesTag({ name }: { name: string }): Promise<string> {
	return await SDK.notes().createTag({ name })
}

export async function restoreNote({ uuid }: { uuid: string }): Promise<void> {
	return await SDK.notes().restore({ uuid })
}

export async function archiveNote({ uuid }: { uuid: string }): Promise<void> {
	return await SDK.notes().archive({ uuid })
}
