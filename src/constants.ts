import UAParser from "ua-parser-js"

export const IS_DESKTOP = typeof window !== "undefined" && typeof window.desktopAPI !== "undefined"
export const TOOLTIP_POPUP_DELAY = 250
export const UAParserResult = new UAParser().getResult()
export const IS_APPLE_DEVICE = UAParserResult.device.vendor?.toLowerCase().includes("apple")
export const IS_WINDOWS_10 =
	typeof window !== "undefined" && typeof window.navigator !== "undefined"
		? window.navigator.userAgent.includes("Windows NT 10.0")
		: false
export const IS_WINDOWS_11 =
	typeof window !== "undefined" && typeof window.navigator !== "undefined"
		? window.navigator.userAgent.includes("Windows NT 11.0")
		: false
export const IS_LINUX =
	typeof window !== "undefined" && typeof window.navigator !== "undefined" ? window.navigator.userAgent.includes("Linux") : false
export const IS_MOBILE_DEVICE =
	UAParserResult.device.type === "mobile" ||
	UAParserResult.device.type === "console" ||
	UAParserResult.device.type === "tablet" ||
	UAParserResult.device.type === "embedded" ||
	UAParserResult.device.type === "smarttv" ||
	UAParserResult.device.type === "wearable"
export const CTRL_KEY_TEXT = IS_APPLE_DEVICE ? "⌘" : "Ctrl"
export const THUMBNAIL_VERSION = 1
export const THUMBNAIL_QUALITY = 0.4
export const THUMBNAIL_MAX_SIZE = 512
export const MiB = 1024 * 1024
export const THUMBNAIL_MAX_FETCH_SIZE = MiB * 64
export const PUBLIC_LINK_BASE_URL = IS_DESKTOP
	? import.meta.env.DEV
		? globalThis.location.protocol + "//" + globalThis.location.host + "/#/d/"
		: "https://app.filen.io/#/d/"
	: globalThis.location.protocol + "//" + globalThis.location.host + "/#/d/"
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
	"directoryPublicLinkInfo",
	"fetchEvent",
	"networkDriveStats",
	"isNetworkDriveMounted",
	"isS3Online",
	"isWebDAVOnline",
	"useIsDesktopHTTPServerOnline",
	"useIsServiceWorkerOnline"
]
export const IS_INSIDE_PUBLIC_LINK_ON_LOAD =
	typeof window !== "undefined" ? window.location.href.includes("/f/") || window.location.href.includes("/d/") : false
export const MAX_PREVIEW_SIZE_WEB = 256 * MiB
export const MAX_PREVIEW_SIZE_SW = Infinity
export const MAX_PREVIEW_SIZE = IS_DESKTOP ? MAX_PREVIEW_SIZE_SW : MAX_PREVIEW_SIZE_WEB
export const VALID_LOCAL_PORT_RANGE = [1024, 65535]
export const SIDEBAR_WIDTH = IS_DESKTOP && IS_APPLE_DEVICE ? 75 : 64
export const DESKTOP_TOPBAR_HEIGHT = IS_DESKTOP ? (IS_APPLE_DEVICE ? 0 : 24) : 0
export const SDK_CONFIG_VERSION = 4
export const DESKTOP_CONFIG_VERSION = 4
export const AUTHED_VERSION = 4
export const MAX_CONCURRENT_UPLOADS = 16
export const MAX_CONCURRENT_DOWNLOADS = 16
export const DESKTOP_HTTP_SERVER_PORT = 61034
export const REMOTE_CFG_NAME = import.meta.env.DEV ? "cfg.test.json" : "cfg.json"
export const CPU_CORES =
	globalThis?.navigator?.hardwareConcurrency && globalThis?.navigator?.hardwareConcurrency > 0
		? globalThis?.navigator?.hardwareConcurrency
		: 2
export const SDK_WORKER_THREADS = CPU_CORES - 4 >= 8 ? 8 : 4
