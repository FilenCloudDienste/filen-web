import worker from "."
import { showSaveFilePicker } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import { proxy } from "comlink"
import eventEmitter from "../eventEmitter"
import * as workerLib from "./worker"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"
import { UAParserResult, THUMBNAIL_VERSION } from "@/constants"
import { fileNameToThumbnailType } from "@/components/dialogs/previewDialog/utils"
import { thumbnailURLObjectCache } from "@/cache"
import { Semaphore, ISemaphore } from "../semaphore"
import { getItem } from "@/lib/localForage"

export const generateThumbnailMutexes: Record<string, ISemaphore> = {}
export const generateThumbnailSemaphore = new Semaphore(3)

const useNative = ["Blink"].includes(UAParserResult?.engine?.name ?? "Gecko")

// Setup message handler. The worker sends messages to the main thread.
worker.setMessageHandler(proxy(event => eventEmitter.emit("workerMessage", event)))

/**
 * Download a file.
 * When the browser does not support the NativeFileSystemAccess API (through WebWorker IPC), we have to fallback to the main thread.
 * @date 3/13/2024 - 4:06:09 AM
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem }} param0
 * @param {DriveCloudItem} param0.item
 * @returns {Promise<void>}
 */
export async function downloadFile({ item }: { item: DriveCloudItem }): Promise<void> {
	if (item.type !== "file") {
		return
	}

	const fileHandle = await showSaveFilePicker({
		suggestedName: item.name,
		_preferPolyfill: !useNative
	})

	if (!useNative) {
		return await workerLib.downloadFile({ item, fileHandle })
	}

	await worker.downloadFile({ item, fileHandle })
}

export async function downloadDirectory({
	uuid,
	name,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt
}: {
	uuid: string
	name: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
}): Promise<void> {
	const fileHandle = await showSaveFilePicker({
		suggestedName: `${name}.zip`,
		_preferPolyfill: !useNative
	})

	if (!useNative) {
		return await workerLib.downloadDirectory({ uuid, name, type, linkUUID, linkHasPassword, linkPassword, linkSalt, fileHandle })
	}

	await worker.downloadDirectory({ uuid, name, type, linkUUID, linkHasPassword, linkPassword, linkSalt, fileHandle })
}

/**
 * Download multiple files and directories as one single ZIP file.
 * When the browser does not support the NativeFileSystemAccess API (through WebWorker IPC), we have to fallback to the main thread.
 * @date 3/13/2024 - 4:06:09 AM
 *
 * @export
 * @async
 * @param {{ items: DriveCloudItem[] }} param0
 * @param {DriveCloudItem[]} param0.items
 * @returns {Promise<void>}
 */
export async function downloadMultipleFilesAndDirectoriesAsZip({ items }: { items: DriveCloudItem[] }): Promise<void> {
	const fileHandle = await showSaveFilePicker({
		suggestedName: `Download_${Date.now()}.zip`,
		_preferPolyfill: !useNative
	})

	if (!useNative) {
		return workerLib.downloadMultipleFilesAndDirectoriesAsZip({ items, fileHandle })
	}

	await worker.downloadMultipleFilesAndDirectoriesAsZip({ items, fileHandle })
}

/**
 * Generate a thumbnail from an item. Optionally fetches it either from the session cache or localStorage.
 * @date 3/20/2024 - 9:00:34 PM
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem }} param0
 * @param {DriveCloudItem} param0.item
 * @returns {Promise<string>}
 */
export async function generateThumbnail({ item }: { item: DriveCloudItem }): Promise<string> {
	if (item.type !== "file") {
		throw new Error("Item not of type file.")
	}

	if (thumbnailURLObjectCache.has(item.uuid)) {
		return thumbnailURLObjectCache.get(item.uuid)!
	}

	await generateThumbnailSemaphore.acquire()

	try {
		if (!generateThumbnailMutexes[item.uuid]) {
			generateThumbnailMutexes[item.uuid] = new Semaphore(1)
		}

		await generateThumbnailMutexes[item.uuid].acquire()

		try {
			const thumbnailType = fileNameToThumbnailType(item.name)
			const dbKey = `thumbnail:${item.uuid}:${THUMBNAIL_VERSION}`

			if (thumbnailType === "image") {
				const blob = await worker.generateImageThumbnail({ item })
				const urlObject = globalThis.URL.createObjectURL(blob)

				thumbnailURLObjectCache.set(item.uuid, urlObject)

				return urlObject
			}

			// Needs to run in the main thread
			if (thumbnailType === "pdf") {
				const fromDb = await getItem<Blob>(dbKey)

				let blob: Blob

				if (fromDb) {
					blob = fromDb
				} else {
					const buffer = await worker.readFile({ item, emitEvents: false })

					blob = await workerLib.generatePDFThumbnail({ item, buffer })
				}

				const urlObject = globalThis.URL.createObjectURL(blob)

				thumbnailURLObjectCache.set(item.uuid, urlObject)

				return urlObject
			}

			// Needs to run in the main thread
			if (thumbnailType === "video") {
				const fromDb = await getItem<Blob>(dbKey)
				let blob: Blob

				if (fromDb) {
					blob = fromDb
				} else {
					const chunkedEnd = 1024 * 1024 * 8 - 1

					const buffer = await worker.readFile({
						item,
						emitEvents: false,
						start: 0,
						end: chunkedEnd >= item.size - 1 ? item.size - 1 : chunkedEnd
					})

					blob = await workerLib.generateVideoThumbnail({ item, buffer })
				}

				const urlObject = globalThis.URL.createObjectURL(blob)

				thumbnailURLObjectCache.set(item.uuid, urlObject)

				return urlObject
			}

			throw new Error(`generateThumbnail not implemented for preview type ${thumbnailType}.`)
		} finally {
			generateThumbnailMutexes[item.uuid].release()
		}
	} finally {
		generateThumbnailSemaphore.release()
	}
}
