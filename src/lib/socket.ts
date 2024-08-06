import SDK from "./sdk"
import { SDK_CONFIG_VERSION } from "@/constants"

let connected = false

export const socket = SDK.socket

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
		const config = window.localStorage.getItem(`sdkConfig:${SDK_CONFIG_VERSION}`)

		if (config) {
			resolve(JSON.parse(config).apiKey)

			return
		}

		const wait = setInterval(() => {
			const config = window.localStorage.getItem(`sdkConfig:${SDK_CONFIG_VERSION}`)

			if (config) {
				clearInterval(wait)

				resolve(JSON.parse(config).apiKey)
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
	if (connected) {
		return
	}

	connected = true

	try {
		const apiKey = await waitForAPIKey()

		socket.connect({ apiKey })
	} catch (e) {
		console.error(e)

		connected = false
	}
}

export default socket
