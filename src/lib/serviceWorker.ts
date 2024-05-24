import { IS_DESKTOP } from "@/constants"

let isRegistered = false

/**
 * Register the FileSystem API (Stream) service worker.
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function registerFSAServiceWorker(): Promise<void> {
	if (isRegistered || IS_DESKTOP || !window || !window.navigator || !("serviceWorker" in window.navigator)) {
		return
	}

	try {
		await window.navigator.serviceWorker.register("/sw.js", { scope: "/" })

		isRegistered = true

		console.log("FSA service worker registered")
	} catch (e) {
		console.error(e)
	}
}
