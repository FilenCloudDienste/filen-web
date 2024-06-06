import useWindowSize from "./useWindowSize"
import { useMemo } from "react"

export default function useSettingsContainerSize() {
	const windowSize = useWindowSize()

	const sizes = useMemo(() => {
		return {
			width: windowSize.width > 1200 ? "80%" : "100%"
		}
	}, [windowSize.width])

	return sizes
}
