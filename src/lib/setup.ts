import { setItem } from "./localForage"
import sdk from "./sdk"
import worker from "./worker"
import { type FilenSDKConfig } from "@filen/sdk"
import { IS_DESKTOP } from "@/constants"
import { registerFSAServiceWorker } from "./serviceWorker"

/**
 * Setup the app.
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function setup(config?: FilenSDKConfig): Promise<void> {
	const authed = globalThis.localStorage.getItem("authed") ?? false
	const sdkConfig = JSON.parse(
		globalThis.localStorage.getItem("sdkConfig") ??
			JSON.stringify({
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
			} satisfies FilenSDKConfig)
	)

	const initConfig = config
		? config
		: authed
			? sdkConfig
			: ({
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
				} satisfies FilenSDKConfig)

	sdk.init(initConfig)

	await setItem("sdkConfig", initConfig)
	await Promise.all([worker.initializeSDK(initConfig), IS_DESKTOP ? window.desktopAPI.initSDK(initConfig) : Promise.resolve()])

	if (!IS_DESKTOP) {
		registerFSAServiceWorker().catch(console.error)
	}
}
