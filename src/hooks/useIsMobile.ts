import { useState, useCallback, useEffect } from "react"

export default function useIsMobile() {
	const [width, setWidth] = useState(window.innerWidth)

	const handleWindowSizeChange = useCallback(() => {
		setWidth(window.innerWidth)
	}, [])

	useEffect(() => {
		window.addEventListener("resize", handleWindowSizeChange)

		return () => {
			window.removeEventListener("resize", handleWindowSizeChange)
		}
	}, [handleWindowSizeChange])

	return width <= 768
}
