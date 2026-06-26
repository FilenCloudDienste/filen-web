import { useState, useCallback, useEffect } from "react"

export type Dimensions = {
	width: number
	height: number
}

export const cache = new Map<string, Dimensions>()

export default function useElementDimensions(elementId: string): Dimensions {
	const [dimensions, setDimensions] = useState<Dimensions>(cache.has(elementId) ? cache.get(elementId)! : { width: 0, height: 0 })

	const updateDimensions = useCallback(() => {
		const element = document.getElementById(elementId)

		if (!element) {
			return
		}

		const width = element.offsetWidth
		const height = element.offsetHeight

		// Ignore transient all-zero reads (element not laid out yet, or momentarily hidden) and keep the last good value: a
		// single stray 0 must never collapse dependent layout. The initial state stays {0,0} until the first real measurement,
		// so consumers that treat 0 as "not measured yet" (e.g. chat height/width fallbacks) keep working.
		if (width === 0 && height === 0) {
			return
		}

		const next = {
			width,
			height
		}

		cache.set(elementId, next)
		setDimensions(next)
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
