import useWindowSize from "./useWindowSize"
import { useEffect, useCallback, useLayoutEffect } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import useLocation from "./useLocation"
import { useDebouncedCallback } from "use-debounce"

export default function useResizablePanelSizes() {
	const windowSize = useWindowSize()
	const location = useLocation()
	const [resizablePanelSizes] = useLocalStorage<(number | undefined | null)[]>(
		location.includes("notes") ? "mainContainerResizablePanelSizes:notes" : "mainContainerResizablePanelSizes",
		[undefined, undefined]
	)
	const [sizes, setSizes] = useLocalStorage<{
		left: {
			width: number
			height: number
		}
		right: {
			width: number
			height: number
		}
	}>("useResizablePanelSizes", {
		left: {
			width: 250,
			height: windowSize.height
		},
		right: {
			width: windowSize.width - 250,
			height: windowSize.height
		}
	})

	const update = useCallback(() => {
		if (!windowSize.width || !windowSize.height || !resizablePanelSizes) {
			setSizes({
				left: {
					width: 250,
					height: windowSize.height
				},
				right: {
					width: windowSize.width - 250,
					height: windowSize.height
				}
			})

			return
		}

		const leftPanel = document.getElementById("left-resizable-panel")
		const rightPanel = document.getElementById("right-resizable-panel")
		const leftPanelRect = leftPanel?.getBoundingClientRect()
		const rightPanelRect = rightPanel?.getBoundingClientRect()

		setSizes({
			left: {
				width: leftPanelRect?.width ?? 250,
				height: leftPanelRect?.height ?? windowSize.height
			},
			right: {
				width: rightPanelRect?.width ?? windowSize.width - 250,
				height: rightPanelRect?.height ?? windowSize.height
			}
		})
	}, [windowSize.width, windowSize.height, resizablePanelSizes, setSizes])

	const updateDebounced = useDebouncedCallback(() => {
		update()
	}, 100)

	useLayoutEffect(() => {
		update()
	}, [update])

	useEffect(() => {
		updateDebounced()
	}, [windowSize.width, windowSize.height, resizablePanelSizes, updateDebounced])

	return sizes
}
