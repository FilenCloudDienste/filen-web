import { useState, useCallback, useEffect } from "react"

export type Dimensions = {
	width: number
	height: number
}

export default function useElementDimensions(elementId: string): Dimensions {
	const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })

	const updateDimensions = useCallback(() => {
		const element = document.getElementById(elementId)

		if (!element) {
			return
		}

		setDimensions({
			width: element.offsetWidth,
			height: element.offsetHeight
		})
	}, [elementId])

	useEffect(() => {
		const element = document.getElementById(elementId)

		if (!element) {
			return
		}

		updateDimensions()

		const resizeObserver = new ResizeObserver(entries => {
			entries.forEach(updateDimensions)
		})

		resizeObserver.observe(element)

		return () => {
			resizeObserver.disconnect()
		}
	}, [elementId, updateDimensions])

	return dimensions
}
