import useWindowSize from "./useWindowSize"
import { useMemo } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import useLocation from "./useLocation"

export default function useResizablePanelSizes() {
	const windowSize = useWindowSize()
	const location = useLocation()
	const [resizablePanelSizes] = useLocalStorage<(number | undefined | null)[]>(
		location.includes("notes") ? "mainContainerResizablePanelSizes:notes" : "mainContainerResizablePanelSizes",
		[undefined, undefined]
	)

	const sizes = useMemo(() => {
		if (!windowSize || !resizablePanelSizes) {
			return {
				left: {
					width: 0,
					height: 0
				},
				right: {
					width: 0,
					height: 0
				}
			}
		}

		const leftPanel = document.getElementById("left-resizable-panel")
		const rightPanel = document.getElementById("right-resizable-panel")
		const leftPanelRect = leftPanel?.getBoundingClientRect()
		const rightPanelRect = rightPanel?.getBoundingClientRect()

		return {
			left: {
				width: leftPanelRect?.width ?? 0,
				height: leftPanelRect?.height ?? 0
			},
			right: {
				width: rightPanelRect?.width ?? 0,
				height: rightPanelRect?.height ?? 0
			}
		}
	}, [windowSize, resizablePanelSizes])

	return sizes
}
