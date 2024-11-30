let isRegistered = false

/**
 * Register service worker.
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function registerServiceWorker(): Promise<void> {
	if (isRegistered || !window || !window.navigator || !("serviceWorker" in window.navigator)) {
		return
	}

	try {
		const registration = await window.navigator.serviceWorker.register(
			import.meta.env.MODE === "production" ? "/sw.js" : "/dev-sw.js?dev-sw",
			{
				scope: "/",
				type: import.meta.env.MODE === "production" ? "classic" : "module"
			}
		)

		await registration.update()

		isRegistered = true

		console.log("Service worker registered")
	} catch (e) {
		console.error(e)
	}
}
