import { setItem } from "./localForage"
import sdk from "./sdk"
import worker from "./worker"
import { type FilenSDKConfig } from "@filen/sdk"
import { IS_DESKTOP } from "@/constants"
import { registerFSAServiceWorker } from "./serviceWorker"
import { type FilenDesktopConfig } from "@filen/desktop/dist/types"
import { clear as clearLocalForage } from "@/lib/localForage"

export const DEFAULT_SDK_CONFIG: FilenSDKConfig = {
	email: "anonymous",
	password: "anonymous",
	masterKeys: ["anonymous"],
	connectToSocket: true,
	metadataCache: true,
	twoFactorCode: "anonymous",
	publicKey: "anonymous",
	privateKey: "anonymous",
	apiKey: "anonymous",
	authVersion: 2,
	baseFolderUUID: "anonymous",
	userId: 1
}

export const DEFAULT_DESKTOP_CONFIG: FilenDesktopConfig = {
	sdkConfig: DEFAULT_SDK_CONFIG,
	webdavConfig: {
		enabled: false,
		username: "admin",
		password: "admin",
		hostname: "127.0.0.1",
		port: 1900,
		proxyMode: false,
		https: false,
		authMode: "basic"
	},
	s3Config: {
		enabled: false,
		accessKeyId: "admin",
		secretKeyId: "admin",
		hostname: "127.0.0.1",
		port: 1800,
		https: false
	},
	virtualDriveConfig: {
		enabled: false,
		mountPoint: IS_DESKTOP ? (window.desktopAPI.platform() === "win32" ? "X:" : "/tmp/filen") : "X:",
		cacheSizeInGi: 10,
		localDirPath: ""
	},
	syncConfig: {
		enabled: true,
		syncPairs: [],
		dbPath: ""
	}
}

/**
 * Setup the app.
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function setup(config?: FilenSDKConfig): Promise<void> {
	const authed = window.localStorage.getItem("authed") ? window.localStorage.getItem("authed") === "true" : false
	const sdkConfig = JSON.parse(window.localStorage.getItem("sdkConfig") ?? JSON.stringify(DEFAULT_SDK_CONFIG))
	const initConfig = config ? config : authed ? sdkConfig : DEFAULT_SDK_CONFIG
	const desktopConfig = JSON.parse(
		window.localStorage.getItem("desktopConfig") ??
			JSON.stringify({
				...DEFAULT_DESKTOP_CONFIG,
				sdkConfig: initConfig
			})
	)

	sdk.init(initConfig)

	if (authed) {
		const isAPIKeyValid = await sdk.user().checkAPIKeyValidity()

		if (!isAPIKeyValid) {
			await logout()

			window.location.href = "/login"

			return
		}
	}

	window.localStorage.setItem("sdkConfig", JSON.stringify(initConfig))
	window.localStorage.setItem("desktopConfig", JSON.stringify(desktopConfig))

	await Promise.all([setItem("sdkConfig", initConfig), setItem("desktopConfig", desktopConfig)])
	await Promise.all([worker.initializeSDK(initConfig), IS_DESKTOP ? window.desktopAPI.setConfig(desktopConfig) : Promise.resolve()])

	if (!IS_DESKTOP) {
		// Try to register it, if it fails we fallback to the polyfill.
		registerFSAServiceWorker().catch(console.error)
	}
}

/**
 * Logout the user and perform all necessary cleanup steps.
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function logout(): Promise<void> {
	if (IS_DESKTOP) {
		await Promise.all([window.desktopAPI.stopS3Server(), window.desktopAPI.stopWebDAVServer(), window.desktopAPI.stopVirtualDrive()])
	}

	const cookieConsent = window.localStorage.getItem("cookieConsent")
	const defaultNoteType = window.localStorage.getItem("defaultNoteType")
	const videoPlayerVolume = window.localStorage.getItem("videoPlayerVolume")
	const chatNotificationsEnabled = window.localStorage.getItem("chatNotificationsEnabled")
	const contactNotificationsEnabled = window.localStorage.getItem("contactNotificationsEnabled")
	const i18nextLng = window.localStorage.getItem("i18nextLng")

	window.localStorage.clear()

	if (cookieConsent) {
		window.localStorage.setItem("cookieConsent", cookieConsent)
	}

	if (defaultNoteType) {
		window.localStorage.setItem("defaultNoteType", defaultNoteType)
	}

	if (videoPlayerVolume) {
		window.localStorage.setItem("videoPlayerVolume", videoPlayerVolume)
	}

	if (chatNotificationsEnabled) {
		window.localStorage.setItem("chatNotificationsEnabled", chatNotificationsEnabled)
	}

	if (contactNotificationsEnabled) {
		window.localStorage.setItem("contactNotificationsEnabled", contactNotificationsEnabled)
	}

	if (i18nextLng) {
		window.localStorage.setItem("i18nextLng", i18nextLng)
	}

	await clearLocalForage()

	sdk.init(DEFAULT_SDK_CONFIG)

	await worker.initializeSDK(DEFAULT_SDK_CONFIG)
}
