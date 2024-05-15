import { useState, useEffect } from "react"

export const useWindowFocus = () => {
	const [focused, setFocused] = useState<boolean>(true)

	useEffect(() => {
		const onFocus = () => setFocused(true)
		const onBlur = () => setFocused(false)

		window.addEventListener("focus", onFocus)
		window.addEventListener("blur", onBlur)

		return () => {
			window.removeEventListener("focus", onFocus)
			window.removeEventListener("blur", onBlur)
		}
	}, [])

	return focused
}

export default useWindowFocus
