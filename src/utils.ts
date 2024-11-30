import { type showSaveFilePicker } from "native-file-system-adapter"
import { UAParserResult, IS_DESKTOP, IS_MOBILE_DEVICE } from "./constants"

export function convertTimestampToMs(timestamp: number): number {
	const now = Date.now()

	if (Math.abs(now - timestamp) < Math.abs(now - timestamp * 1000)) {
		return timestamp
	}

	return Math.floor(timestamp * 1000)
}

export function simpleDate(timestamp: number): string {
	try {
		return new Date(convertTimestampToMs(timestamp)).toString().split(" ").slice(0, 5).join(" ")
	} catch (e) {
		return new Date().toString().split(" ").slice(0, 5).join(" ")
	}
}

export function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) {
		return "0 Bytes"
	}

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Simple helper function to preventDefault on events of all kind. Mostly used as an "inline function" inside components.
 * @date 3/29/2024 - 3:52:16 AM
 *
 * @export
 * @param {(Event | FocusEvent | unknown | never)} e
 */
export function preventDefault(e: Event | FocusEvent | unknown | never): void {
	if (!e) {
		return
	}

	const event = e as unknown as Event

	if (event.preventDefault && typeof event.preventDefault === "function") {
		event.preventDefault()
	}
}

/**
 * Download text to a file.
 * @date 4/4/2024 - 1:02:34 AM
 *
 * @export
 * @param {{name: string, content: string}} param0
 * @param {string} param0.name
 * @param {string} param0.content
 */
export function downloadTextFile({ name, content }: { name: string; content: string }): void {
	const element = document.createElement("a")

	element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content))
	element.setAttribute("download", name)
	element.style.display = "none"

	document.body.appendChild(element)

	element.click()

	document.body.removeChild(element)
}

export function getShowSaveFilePickerOptions({
	name,
	types,
	excludeAcceptAllOption
}: {
	name?: string
	types?: { accept: Record<string, string[]> }[]
	excludeAcceptAllOption?: boolean
}): Parameters<typeof showSaveFilePicker>[0] {
	const osName = UAParserResult.os.name?.trim().toLowerCase() ?? ""
	const preferPolyfill =
		IS_MOBILE_DEVICE && !IS_DESKTOP
			? true
			: osName.length === 0 || IS_DESKTOP
				? false
				: osName === "android" || osName === "ios" || osName === "blackberry"

	return {
		//_name: name,
		suggestedName: name,
		types: types && types.length > 0 ? types : undefined,
		excludeAcceptAllOption,
		_preferPolyfill: preferPolyfill
	}
}
