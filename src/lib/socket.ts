import { getSDK } from "./sdk"
import { getSDKConfig } from "@/hooks/useSDKConfig"

export function getSocket() {
	return getSDK().socket
}

/**
 * We need to wait for an API key first before connecting.
 * Resolves as soon as the user is logged in.
 *
 * @export
 * @async
 * @returns {Promise<string>}
 */
export async function waitForAPIKey(): Promise<string> {
	return new Promise<string>(resolve => {
		const config = getSDKConfig()

		if (config && config.apiKey && config.apiKey.length > 32) {
			resolve(config.apiKey)

			return
		}

		const wait = setInterval(() => {
			const config = getSDKConfig()

			if (config && config.apiKey && config.apiKey.length > 32) {
				clearInterval(wait)

				resolve(config.apiKey)
			}
		}, 1000)
	})
}

/**
 * Connect to the socket sever using the SDK.
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function connect(): Promise<void> {
	try {
		const apiKey = await waitForAPIKey()

		getSocket().connect({ apiKey })
	} catch (e) {
		console.error(e)
	}
}
