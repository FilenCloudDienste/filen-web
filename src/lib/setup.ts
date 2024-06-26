import { setItem } from "./localForage"
import sdk from "./sdk"
import worker from "./worker"
import { type FilenSDKConfig } from "@filen/sdk"
import { IS_DESKTOP } from "@/constants"
import { registerFSAServiceWorker } from "./serviceWorker"
import { type FilenDesktopConfig } from "@filen/desktop/dist/types"

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
		username: "admin",
		password: "admin",
		hostname: "127.0.0.1",
		port: 1900,
		proxyMode: false,
		https: false,
		authMode: "digest"
	},
	s3Config: {
		secretKeyId: "admin",
		accessKeyId: "admin",
		hostname: "127.0.0.1",
		port: 1800,
		https: false
	},
	virtualDriveConfig: {
		mountPoint: "M:",
		localDirPath: ""
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
	const authed = globalThis.localStorage.getItem("authed") ?? false
	const sdkConfig = JSON.parse(globalThis.localStorage.getItem("sdkConfig") ?? JSON.stringify(DEFAULT_SDK_CONFIG))
	const initConfig = config ? config : authed ? sdkConfig : DEFAULT_SDK_CONFIG
	const desktopConfig = JSON.parse(
		globalThis.localStorage.getItem("desktopConfig") ??
			JSON.stringify({
				...DEFAULT_DESKTOP_CONFIG,
				sdkConfig: initConfig
			})
	)

	sdk.init(initConfig)

	const isAPIKeyValid = await sdk.user().checkAPIKeyValidity()

	if (!isAPIKeyValid) {
		globalThis.localStorage.clear()
		globalThis.location.href = "/login"

		return
	}

	globalThis.localStorage.setItem("sdkConfig", JSON.stringify(initConfig))
	globalThis.localStorage.setItem("desktopConfig", JSON.stringify(desktopConfig))

	await Promise.all([setItem("sdkConfig", initConfig), setItem("desktopConfig", desktopConfig)])
	await Promise.all([worker.initializeSDK(initConfig), IS_DESKTOP ? window.desktopAPI.setConfig(desktopConfig) : Promise.resolve()])

	if (!IS_DESKTOP) {
		registerFSAServiceWorker().catch(console.error)
	}
}
