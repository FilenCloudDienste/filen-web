import UAParser from "ua-parser-js"

export const IS_DESKTOP = typeof window !== "undefined" && typeof window.desktopAPI !== "undefined"
export const TOOLTIP_POPUP_DELAY = 250
export const UAParserResult = new UAParser().getResult()
export const CTRL_KEY_TEXT = UAParserResult.device.vendor === "Apple" ? "⌘" : "Ctrl"
export const THUMBNAIL_VERSION = 1
export const THUMBNAIL_QUALITY = 0.5
export const THUMBNAIL_MAX_SIZE = 256
export const MiB = 1024 * 1024
export const THUMBNAIL_MAX_FETCH_SIZE = MiB * 32
