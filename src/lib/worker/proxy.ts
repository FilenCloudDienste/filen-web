/* eslint-disable @typescript-eslint/no-unused-vars */
import worker from "."
import { showSaveFilePicker } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import { proxy } from "comlink"
import eventEmitter from "../eventEmitter"
import * as workerLib from "./worker"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"
import { UAParserResult, THUMBNAIL_VERSION, IS_DESKTOP } from "@/constants"
import { fileNameToThumbnailType } from "@/components/dialogs/previewDialog/utils"
import { thumbnailURLObjectCache } from "@/cache"
import { Semaphore, ISemaphore } from "../semaphore"
import { getItem } from "@/lib/localForage"
import { sanitizeFileName } from "../utils"
import { getShowSaveFilePickerOptions, isMobileDevice } from "@/utils"
import streamSaver from "streamsaver"

export const generateThumbnailMutexes: Record<string, ISemaphore> = {}
export const generateThumbnailSemaphore = new Semaphore(3)
export const useWorkerForDownloads =
	IS_DESKTOP || (!isMobileDevice() && ["chrome", "chromium"].includes(UAParserResult?.browser?.name?.toLowerCase().trim() ?? "gecko"))

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

	if (!useWorkerForDownloads) {
		const streamHandle = streamSaver.createWriteStream(sanitizeFileName(item.name), {
			size: item.size,
			pathname: `/download/${encodeURIComponent(sanitizeFileName(item.name))}`
		})

		return await workerLib.downloadFile({
			item,
			fileHandle: streamHandle
		})
	}

	const fileHandle = await showSaveFilePicker(
		getShowSaveFilePickerOptions({
			name: sanitizeFileName(item.name)
		})
	)

	await worker.downloadFile({
		item,
		fileHandle
	})
}

/**
 * Download a directory.
 *
 * @export
 * @async
 * @param {{
 * 	uuid: string
 * 	name: string
 * 	type?: DirDownloadType
 * 	linkUUID?: string
 * 	linkHasPassword?: boolean
 * 	linkPassword?: string
 * 	linkSalt?: string
 * }} param0
 * @param {string} param0.uuid
 * @param {string} param0.name
 * @param {DirDownloadType} param0.type
 * @param {string} param0.linkUUID
 * @param {boolean} param0.linkHasPassword
 * @param {string} param0.linkPassword
 * @param {string} param0.linkSalt
 * @returns {Promise<void>}
 */
export async function downloadDirectory({
	uuid,
	name,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	linkKey
}: {
	uuid: string
	name: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	linkKey?: string
}): Promise<void> {
	name = `${sanitizeFileName(name)}.zip`

	if (!useWorkerForDownloads) {
		const streamHandle = streamSaver.createWriteStream(name, {
			pathname: `/download/${encodeURIComponent(name)}`
		})

		return await workerLib.downloadDirectory({
			uuid,
			type,
			linkUUID,
			linkHasPassword,
			linkPassword,
			linkSalt,
			linkKey,
			fileHandle: streamHandle,
			name
		})
	}

	const fileHandle = await showSaveFilePicker(
		getShowSaveFilePickerOptions({
			name
		})
	)

	await worker.downloadDirectory({
		uuid,
		type,
		linkUUID,
		linkHasPassword,
		linkPassword,
		linkSalt,
		linkKey,
		fileHandle,
		name
	})
}

/**
 * Download multiple files and directories as one single ZIP file.
 * When the browser does not support the NativeFileSystemAccess API (through WebWorker IPC), we have to fallback to the main thread.
 *
 * @export
 * @async
 * @param {{ items: DriveCloudItem[]; name?: string, type?: DirDownloadType
 * 	linkUUID?: string
 * 	linkHasPassword?: boolean
 * 	linkPassword?: string
 * 	linkSalt?: string }} param0
 * @param {{}} param0.items
 * @param {string} param0.name
 * @param {DirDownloadType} param0.type
 * @param {boolean} param0.linkHasPassword
 * @param {string} param0.linkPassword
 * @param {string} param0.linkSalt
 * @param {string} param0.linkUUID
 * @returns {Promise<void>}
 */
export async function downloadMultipleFilesAndDirectoriesAsZip({
	items,
	name,
	type,
	linkHasPassword,
	linkPassword,
	linkSalt,
	linkKey,
	linkUUID
}: {
	items: DriveCloudItem[]
	name?: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	linkKey?: string
}): Promise<void> {
	name = name ? sanitizeFileName(name) : `Download_${Date.now()}.zip`

	const itemsWithPath = items.map(item => ({
		...item,
		path: item.name
	}))

	if (!useWorkerForDownloads) {
		const streamHandle = streamSaver.createWriteStream(sanitizeFileName(name), {
			pathname: `/download/${encodeURIComponent(sanitizeFileName(name))}`
		})

		return workerLib.downloadMultipleFilesAndDirectoriesAsZip({
			items: itemsWithPath,
			fileHandle: streamHandle,
			type,
			linkHasPassword,
			linkPassword,
			linkSalt,
			linkKey,
			linkUUID,
			name
		})
	}

	const fileHandle = await showSaveFilePicker(
		getShowSaveFilePickerOptions({
			name
		})
	)

	await worker.downloadMultipleFilesAndDirectoriesAsZip({
		items: itemsWithPath,
		fileHandle,
		type,
		linkHasPassword,
		linkPassword,
		linkSalt,
		linkKey,
		linkUUID,
		name
	})
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

		await generateThumbnailMutexes[item.uuid]?.acquire()

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
					const buffer = await worker.readFile({
						item,
						emitEvents: false
					})

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
					blob = await workerLib.generateVideoThumbnail({
						item
					})
				}

				const urlObject = globalThis.URL.createObjectURL(blob)

				thumbnailURLObjectCache.set(item.uuid, urlObject)

				return urlObject
			}

			throw new Error(`generateThumbnail not implemented for preview type ${thumbnailType}.`)
		} finally {
			generateThumbnailMutexes[item.uuid]?.release()
		}
	} finally {
		generateThumbnailSemaphore.release()
	}
}

/**
 * Sanitize an SVG file. Needs to run in the main thread.
 *
 * @export
 * @async
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function sanitizeSVG(file: File): Promise<File> {
	return await workerLib.sanitizeSVG(file)
}

/**
 * Read a file and sanitize it. Needs to run in the main thread.
 *
 * @export
 * @async
 * @param {{ item: DriveCloudItem; start?: number; end?: number, emitEvents?: boolean }} param0
 * @param {DriveCloudItem} param0.item
 * @param {number} param0.start
 * @param {number} param0.end
 * @param {boolean} param0.emitEvents
 * @returns {Promise<Buffer>}
 */
export async function readFileAndSanitize({
	item,
	start,
	end,
	emitEvents
}: {
	item: DriveCloudItem
	start?: number
	end?: number
	emitEvents?: boolean
}): Promise<Buffer> {
	if (item.type !== "file") {
		throw new Error("Invalid item type, expected file.")
	}

	let buffer: Buffer = await worker.readFile({
		item,
		emitEvents,
		start,
		end
	})

	if (item.name.endsWith(".svg") || item.mime === "image/svg+xml") {
		const sanitizedSVG = await sanitizeSVG(
			new File([buffer], item.name, {
				type: item.mime,
				lastModified: item.lastModified
			})
		)

		const sanitizedArrayBuffer = await sanitizedSVG.arrayBuffer()

		buffer = Buffer.from(sanitizedArrayBuffer)
	}

	return buffer
}
