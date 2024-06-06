import { useMemo } from "react"
import useElementDimensions from "./useElementDimensions"
import useIsMobile from "./useIsMobile"

export default function useDriveListColumnSize() {
	const container = useElementDimensions("virtuoso-drive-list")
	const isMobile = useIsMobile()

	const sizes = useMemo(() => {
		const containerWidth = container.width
		const sizePx = isMobile ? 50 : 100
		const modifiedPx = isMobile ? 100 : 250
		const morePx = isMobile ? 0 : 30

		return {
			name: containerWidth - sizePx - modifiedPx - morePx,
			size: sizePx,
			modified: modifiedPx,
			more: morePx
		}
	}, [container.width, isMobile])

	return sizes
}
