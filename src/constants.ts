import UAParser from "ua-parser-js"

export const IS_DESKTOP = typeof window !== "undefined" && typeof window.desktopAPI !== "undefined"
export const TOOLTIP_POPUP_DELAY = 250
export const UAParserResult = new UAParser().getResult()
export const CTRL_KEY_TEXT = UAParserResult.device.vendor === "Apple" ? "⌘" : "CTRL"
