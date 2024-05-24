// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Listener = (data?: any) => void

export const LISTENERS: Record<string, Listener[]> = {}

export const eventEmitter = {
	on: (name: string, listener: Listener) => {
		if (!LISTENERS[name]) {
			LISTENERS[name] = []
		}

		LISTENERS[name]!.push(listener)

		return {
			remove: () => {
				if (!LISTENERS[name]) {
					return
				}

				LISTENERS[name] = LISTENERS[name]!.filter(filteredListener => filteredListener !== listener)
			}
		}
	},
	emit: (name: string, data?: unknown) => {
		if (!LISTENERS[name]) {
			return
		}

		LISTENERS[name]!.forEach(listener => {
			listener(data)
		})
	}
}

export default eventEmitter
