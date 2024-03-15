import worker from "."
import { showSaveFilePicker } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import { proxy } from "comlink"
import eventEmitter from "../eventEmitter"
import * as workerLib from "./worker"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"
import { UAParserResult } from "@/constants"

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

	const useNative = ["Blink", "WebKit"].includes(UAParserResult.engine.name ?? "Gecko")

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
	const useNative = ["Blink", "WebKit"].includes(UAParserResult.engine.name ?? "Gecko")

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
	const useNative = ["Blink", "WebKit"].includes(UAParserResult.engine.name ?? "Gecko")

	const fileHandle = await showSaveFilePicker({
		suggestedName: `Download_${Date.now()}.zip`,
		_preferPolyfill: !useNative
	})

	if (!useNative) {
		return workerLib.downloadMultipleFilesAndDirectoriesAsZip({ items, fileHandle })
	}

	await worker.downloadMultipleFilesAndDirectoriesAsZip({ items, fileHandle })
}
