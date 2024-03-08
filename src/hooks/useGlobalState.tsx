import { useState, useEffect } from "react"
import eventEmitter from "@/lib/eventEmitter"

export function useGlobalState<T>(name: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
	const [state, setState] = useState<T>(initial)

	useEffect(() => {
		const listener = eventEmitter.on("useGlobalState", ({ name: n, state: s }) => {
			if (name === n) {
				setState(s)
			}
		})

		return () => {
			listener.remove()
		}
	}, [name, initial])

	useEffect(() => {
		eventEmitter.emit("useGlobalState", {
			name,
			state
		})
	}, [state, name])

	return [state, setState]
}

export function updateGlobalState<T>(name: string, state: T): void {
	eventEmitter.emit("useGlobalState", {
		name,
		state
	})
}

export default useGlobalState
