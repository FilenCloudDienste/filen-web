import useWindowSize from "./useWindowSize"
import { useMemo } from "react"

export default function useContactsContainerSize() {
	const windowSize = useWindowSize()

	const sizes = useMemo(() => {
		return {
			width: windowSize.width > 1200 ? "75%" : "100%"
		}
	}, [windowSize.width])

	return sizes
}
