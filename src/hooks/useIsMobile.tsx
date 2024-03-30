import { useState, useCallback } from "react"
import useMountedEffect from "./useMountedEffect"

export default function useIsMobile() {
	const [width, setWidth] = useState(window.innerWidth)

	const handleWindowSizeChange = useCallback(() => {
		setWidth(window.innerWidth)
	}, [])

	useMountedEffect(() => {
		window.addEventListener("resize", handleWindowSizeChange)

		return () => {
			window.removeEventListener("resize", handleWindowSizeChange)
		}
	})

	return width <= 768
}
