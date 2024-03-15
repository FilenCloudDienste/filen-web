import SDK from "../sdk"
import { type FilenSDKConfig } from "@filen/sdk"
import { type FileSystemFileHandle } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import { set } from "idb-keyval"
import { orderItemsByType } from "@/components/drive/utils"
import { type WorkerToMainMessage, type DriveCloudItemWithPath } from "./types"
import { ZipWriter } from "@zip.js/zip.js"
import { promiseAllChunked } from "../utils"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"
import eventEmitter from "../eventEmitter"

let isInitialized = false
// We setup an eventEmitter first here in case we are running in the main thread.
let postMessageToMain: (message: WorkerToMainMessage) => void = message => eventEmitter.emit("workerMessage", message)

export async function waitForInitialization(): Promise<void> {
	if (isInitialized) {
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

export async function encryptMetadata({ metadata, key, derive }: { metadata: string; key?: string; derive?: boolean }) {
	await waitForInitialization()

	return await SDK.crypto().encrypt().metadata({ metadata, key, derive })
}

export async function decryptMetadata({ metadata, key }: { metadata: string; key: string }) {
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
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false,
						rm: ""
					}
				: {
						...item,
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false
					}
		)

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false,
						rm: ""
					}
				: {
						...item,
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false
					}
		)

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
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

export async function uploadFile({ file, parent }: { file: File; parent: string }): Promise<void> {
	await waitForInitialization()

	const fileId = `${file.name}:${file.size}:${file.type}:${file.lastModified}:${file.webkitRelativePath}`

	await SDK.cloud().uploadWebFile({
		file,
		parent,
		name: file.name,
		onQueued: () => {
			postMessageToMain({
				type: "download",
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
				type: "download",
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
				type: "download",
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
				type: "download",
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
				type: "download",
				data: {
					type: "error",
					uuid: fileId,
					err,
					name: file.name,
					size: file.size
				}
			})
		}
	})
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
									lastModified: Date.now(),
									timestamp: Date.now(),
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
			lastModified: Date.now(),
			timestamp: Date.now(),
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
