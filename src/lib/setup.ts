import { setItem } from "./localForage"
import { reinitSDK, getSDK } from "./sdk"
import worker from "./worker"
import { type FilenSDKConfig } from "@filen/sdk"
import { IS_DESKTOP, DESKTOP_CONFIG_VERSION, SDK_CONFIG_VERSION } from "@/constants"
import { registerFSAServiceWorker } from "./serviceWorker"
import { type FilenDesktopConfig } from "@filen/desktop/dist/types"
import { clear as clearLocalForage } from "@/lib/localForage"
import { connect as socketConnect } from "@/lib/socket"
import { localStorageKey as authedLocalStorageKey } from "@/hooks/useIsAuthed"
import queryClientPersisterIDB from "./queryPersister"

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
	networkDriveConfig: {
		enabled: false,
		mountPoint: IS_DESKTOP ? (window.desktopAPI.osPlatform() === "win32" ? "X:" : "/tmp/filen") : "X:",
		cacheSizeInGi: 10,
		localDirPath: "",
		cachePath: undefined,
		readOnly: false
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
export async function setup(config?: FilenSDKConfig, connectToSocket: boolean = false): Promise<void> {
	const authed = window.localStorage.getItem(authedLocalStorageKey)
		? window.localStorage.getItem(authedLocalStorageKey) === "true"
		: false
	const sdkConfig = JSON.parse(window.localStorage.getItem(`sdkConfig:${SDK_CONFIG_VERSION}`) ?? JSON.stringify(DEFAULT_SDK_CONFIG))
	const initConfig = config ? config : authed ? sdkConfig : DEFAULT_SDK_CONFIG
	const desktopConfig = JSON.parse(
		window.localStorage.getItem(`desktopConfig:${DESKTOP_CONFIG_VERSION}`) ??
			JSON.stringify({
				...DEFAULT_DESKTOP_CONFIG,
				sdkConfig: initConfig
			})
	)

	reinitSDK(initConfig)

	getSDK().init(initConfig)

	if (authed) {
		const isAPIKeyValid = await getSDK().user().checkAPIKeyValidity()

		if (!isAPIKeyValid) {
			await logout()

			return
		}
	}

	if (authed || connectToSocket) {
		console.log("Connecting to socket")

		await socketConnect()
	}

	window.localStorage.setItem(`sdkConfig:${SDK_CONFIG_VERSION}`, JSON.stringify(initConfig))
	window.localStorage.setItem(`desktopConfig:${DESKTOP_CONFIG_VERSION}`, JSON.stringify(desktopConfig))

	await Promise.all([
		setItem(`sdkConfig:${SDK_CONFIG_VERSION}`, initConfig),
		setItem(`desktopConfig:${DESKTOP_CONFIG_VERSION}`, desktopConfig)
	])
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
	await Promise.all([clearLocalForage(), queryClientPersisterIDB.clear()])

	if (IS_DESKTOP) {
		await Promise.all([
			window.desktopAPI.stopS3Server(),
			window.desktopAPI.stopWebDAVServer(),
			window.desktopAPI.stopNetworkDrive(),
			window.desktopAPI.stopSync()
		])
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

	if (IS_DESKTOP) {
		await window.desktopAPI.restart()
	} else {
		window.location.reload()
	}
}
