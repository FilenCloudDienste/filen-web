import worker from "."
import { showSaveFilePicker } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import UAParser from "ua-parser-js"
import sdk from "../sdk"

const parser = new UAParser().getResult()

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

	const useNative = ["Blink", "WebKit"].includes(parser.engine.name ?? "Gecko")

	const fileHandle = await showSaveFilePicker({
		suggestedName: item.name,
		_preferPolyfill: !useNative
	})

	if (!useNative) {
		const stream = await sdk.cloud().downloadFileToReadableStream({
			uuid: item.uuid,
			bucket: item.bucket,
			region: item.region,
			version: item.version,
			chunks: item.chunks,
			key: item.key
		})

		const writer = await fileHandle.createWritable()

		stream.pipeTo(writer)

		return
	}

	await worker.downloadFile({ item, fileHandle })
}
