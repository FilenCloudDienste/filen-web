import UAParser from "ua-parser-js"

export const IS_DESKTOP = typeof window !== "undefined" && typeof window.desktopAPI !== "undefined"
export const TOOLTIP_POPUP_DELAY = 250
export const UAParserResult = new UAParser().getResult()
export const CTRL_KEY_TEXT = UAParserResult.device.vendor === "Apple" ? "⌘" : "Ctrl"
export const THUMBNAIL_VERSION = 1
export const THUMBNAIL_QUALITY = 0.4
export const THUMBNAIL_MAX_SIZE = 512
export const MiB = 1024 * 1024
export const THUMBNAIL_MAX_FETCH_SIZE = MiB * 32
export const PUBLIC_LINK_BASE_URL = IS_DESKTOP
	? import.meta.env.DEV
		? globalThis.location.protocol + "//" + globalThis.location.host + "/#/d/"
		: "https://app.filen.io/#/d/"
	: globalThis.location.protocol + "//" + globalThis.location.host + "/#/d/"
export const IS_APPLE_DEVICE = UAParserResult.device.vendor === "Apple"
export const UNCACHED_QUERY_KEYS = [
	"chatYouTubeEmbedInfo",
	"directoryPublicLinkStatus",
	"filePublicLinkStatus",
	"chatConversationUnreadCount",
	"chatLastFocus",
	"chatConversationOnline",
	"chatsUnreadCount",
	"contactsRequestInCount",
	"filePublicLinkHasPassword",
	"filePublicLinkInfo",
	"directoryPublicLinkInfo"
]
export const IS_INSIDE_PUBLIC_LINK_ON_LOAD =
	typeof window !== "undefined" ? window.location.href.includes("/f/") || window.location.href.includes("/d/") : false
export const MAX_PREVIEW_SIZE = 256 * MiB
export const VALID_LOCAL_PORT_RANGE = [1024, 65535]
export const SIDEBAR_WIDTH = IS_DESKTOP && IS_APPLE_DEVICE ? 76 : 64
export const DESKTOP_TOPBAR_HEIGHT = IS_DESKTOP ? (IS_APPLE_DEVICE ? 0 : 24) : 0
