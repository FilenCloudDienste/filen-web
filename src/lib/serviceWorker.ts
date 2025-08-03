export class ServiceWorker {
	private isRegistered: boolean = false

	public async register(): Promise<void> {
		if (this.isRegistered || !window || !window.navigator || !("serviceWorker" in window.navigator)) {
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

			this.isRegistered = true

			console.log("Service worker registered")
		} catch (e) {
			console.error(e)
		}
	}
}

export const serviceWorker = new ServiceWorker()

export default serviceWorker
