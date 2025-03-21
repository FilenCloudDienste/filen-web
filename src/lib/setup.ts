import { setItem } from "./localForage"
import { reinitSDK, getSDK } from "./sdk"
import worker from "./worker"
import { type FilenSDKConfig, ANONYMOUS_SDK_CONFIG } from "@filen/sdk"
import { IS_DESKTOP } from "@/constants"
import { registerServiceWorker } from "./serviceWorker"
import { type FilenDesktopConfig } from "@filen/desktop/dist/types"
import { clear as clearLocalForage } from "@/lib/localForage"
import { connect as socketConnect } from "@/lib/socket"
import { localStorageKey as authedLocalStorageKey } from "@/hooks/useIsAuthed"
import queryClientPersisterIDB from "./queryPersister"
import { localStorageKey as sdkConfigLocalStorageKey } from "@/hooks/useSDKConfig"
import {
	localStorageKey as desktopConfigLocalStorageKey,
	setDesktopConfig,
	syncConfigLocalStorageKey,
	networkDriveConfigLocalStorageKey,
	webdavConfigLocalStorageKey,
	s3ConfigLocalStorageKey
} from "@/hooks/useDesktopConfig"
import { STORAGE_KEY as themeStorageKey } from "@/providers/themeProvider"

export const DEFAULT_DESKTOP_CONFIG: FilenDesktopConfig = {
	// @ts-expect-error TODO: Remove when desktop sdk is updated
	sdkConfig: {
		...ANONYMOUS_SDK_CONFIG,
		connectToSocket: true,
		metadataCache: true
	},
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

export async function resetLocalStorage(): Promise<void> {
	await Promise.all([clearLocalForage(), queryClientPersisterIDB.clear()])

	const cookieConsent = window.localStorage.getItem("cookieConsent")
	const defaultNoteType = window.localStorage.getItem("defaultNoteType")
	const videoPlayerVolume = window.localStorage.getItem("videoPlayerVolume")
	const chatNotificationsEnabled = window.localStorage.getItem("chatNotificationsEnabled")
	const contactNotificationsEnabled = window.localStorage.getItem("contactNotificationsEnabled")
	const i18nextLng = window.localStorage.getItem("i18nextLng")
	const audioPlayerVolume = window.localStorage.getItem("audioPlayerVolume")
	const driveSortBy = window.localStorage.getItem("driveSortBy")
	const listType = window.localStorage.getItem("listType")
	const lockPin = window.localStorage.getItem("lockPin")
	const lockTimeout = window.localStorage.getItem("lockTimeout")
	const mainContainerResizablePanelSizes = window.localStorage.getItem("mainContainerResizablePanelSizes")
	const mainContainerResizablePanelSizesNotes = window.localStorage.getItem("mainContainerResizablePanelSizes:notes")
	const minimizeToTrayEnabled = window.localStorage.getItem("minimizeToTrayEnabled")
	const sideBarTreeOpen = window.localStorage.getItem("sideBarTreeOpen")
	const textEditorResizablePanelSizes = window.localStorage.getItem("textEditorResizablePanelSizes")
	const textEditorResizablePanelSizesNotes = window.localStorage.getItem("textEditorResizablePanelSizes:notes")
	const textEditorResizablePanelSizesPublicLink = window.localStorage.getItem("textEditorResizablePanelSizes:publicLink")
	const useResizablePanelSizes = window.localStorage.getItem("useResizablePanelSizes")
	const theme = window.localStorage.getItem(themeStorageKey)
	const networkDriveConfig = window.localStorage.getItem(networkDriveConfigLocalStorageKey)
	const syncConfig = window.localStorage.getItem(syncConfigLocalStorageKey)
	const webdavConfig = window.localStorage.getItem(webdavConfigLocalStorageKey)
	const s3Config = window.localStorage.getItem(s3ConfigLocalStorageKey)

	window.localStorage.clear()

	if (networkDriveConfig) {
		window.localStorage.setItem(networkDriveConfigLocalStorageKey, networkDriveConfig)
	}

	if (syncConfig) {
		window.localStorage.setItem(syncConfigLocalStorageKey, syncConfig)
	}

	if (webdavConfig) {
		window.localStorage.setItem(webdavConfigLocalStorageKey, webdavConfig)
	}

	if (s3Config) {
		window.localStorage.setItem(s3ConfigLocalStorageKey, s3Config)
	}

	if (theme) {
		window.localStorage.setItem(themeStorageKey, theme)
	}

	if (useResizablePanelSizes) {
		window.localStorage.setItem("useResizablePanelSizes", useResizablePanelSizes)
	}

	if (textEditorResizablePanelSizes) {
		window.localStorage.setItem("textEditorResizablePanelSizes", textEditorResizablePanelSizes)
	}

	if (textEditorResizablePanelSizesNotes) {
		window.localStorage.setItem("textEditorResizablePanelSizes:notes", textEditorResizablePanelSizesNotes)
	}

	if (textEditorResizablePanelSizesPublicLink) {
		window.localStorage.setItem("textEditorResizablePanelSizes:publicLink", textEditorResizablePanelSizesPublicLink)
	}

	if (cookieConsent) {
		window.localStorage.setItem("cookieConsent", cookieConsent)
	}

	if (mainContainerResizablePanelSizes) {
		window.localStorage.setItem("mainContainerResizablePanelSizes", mainContainerResizablePanelSizes)
	}

	if (mainContainerResizablePanelSizesNotes) {
		window.localStorage.setItem("mainContainerResizablePanelSizes:notes", mainContainerResizablePanelSizesNotes)
	}

	if (driveSortBy) {
		window.localStorage.setItem("driveSortBy", driveSortBy)
	}

	if (lockPin) {
		window.localStorage.setItem("lockPin", lockPin)
	}

	if (lockTimeout) {
		window.localStorage.setItem("lockTimeout", lockTimeout)
	}

	if (listType) {
		window.localStorage.setItem("listType", listType)
	}

	if (defaultNoteType) {
		window.localStorage.setItem("defaultNoteType", defaultNoteType)
	}

	if (videoPlayerVolume) {
		window.localStorage.setItem("videoPlayerVolume", videoPlayerVolume)
	}

	if (audioPlayerVolume) {
		window.localStorage.setItem("audioPlayerVolume", audioPlayerVolume)
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

	if (minimizeToTrayEnabled) {
		window.localStorage.setItem("minimizeToTrayEnabled", minimizeToTrayEnabled)
	}

	if (sideBarTreeOpen) {
		window.localStorage.setItem("sideBarTreeOpen", sideBarTreeOpen)
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

	const sdkConfig: FilenSDKConfig = JSON.parse(
		window.localStorage.getItem(sdkConfigLocalStorageKey) ??
			JSON.stringify({
				...ANONYMOUS_SDK_CONFIG,
				connectToSocket: true,
				metadataCache: true
			})
	)

	const initConfig = config
		? config
		: authed
			? sdkConfig
			: {
					...ANONYMOUS_SDK_CONFIG,
					connectToSocket: true,
					metadataCache: true
				}

	const desktopConfig = JSON.parse(
		window.localStorage.getItem(desktopConfigLocalStorageKey) ??
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

	window.localStorage.setItem(sdkConfigLocalStorageKey, JSON.stringify(initConfig))

	setDesktopConfig(desktopConfig, false)

	await Promise.allSettled([
		setItem(sdkConfigLocalStorageKey, initConfig),
		setItem(desktopConfigLocalStorageKey, desktopConfig),
		IS_DESKTOP ? Promise.resolve() : registerServiceWorker()
	]).catch(console.error)

	await Promise.all([worker.initializeSDK(initConfig), IS_DESKTOP ? window.desktopAPI.setConfig(desktopConfig) : Promise.resolve()])

	window.disableInvalidAPIKeyLogout = false

	console.log("Setup done")
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
		await Promise.all([
			window.desktopAPI.stopS3Server(),
			window.desktopAPI.stopWebDAVServer(),
			window.desktopAPI.stopNetworkDrive(),
			window.desktopAPI.stopSync()
		])
	}

	await resetLocalStorage()

	if (IS_DESKTOP) {
		await window.desktopAPI.restart()
	} else {
		window.location.reload()
	}
}
