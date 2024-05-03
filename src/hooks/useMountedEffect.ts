/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef } from "react"

declare const UNDEFINED_VOID_ONLY: unique symbol
export type Destructor = () => void | { [UNDEFINED_VOID_ONLY]: never }
export type Effect = () => void | Destructor

/**
 * "Hacky" way to only run a function ONCE when a component mounts. A simple useEffect is sometimes not enough.
 * @date 3/29/2024 - 3:37:00 AM
 *
 * @export
 * @param {Effect} effect
 */
export default function useMountedEffect(effect: Effect) {
	const didMount = useRef<boolean>(false)

	useEffect(() => {
		let onUnmount: ReturnType<typeof effect>

		if (!didMount.current) {
			didMount.current = true
			onUnmount = effect()
		}

		return () => {
			if (typeof onUnmount === "function") {
				onUnmount()
			}
		}
	}, [])
}
