import { useState, useCallback, useMemo, memo, useRef } from "react"
import { useDriveItemsStore } from "@/stores/drive.store"
import useLocation from "@/hooks/useLocation"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"

export type DragSelectPosition = { x: number; y: number }

export const DragSelect = memo(({ children }: { children: React.ReactNode }) => {
	const [isDragging, setIsDragging] = useState<boolean>(false)
	const [startPos, setStartPos] = useState<DragSelectPosition>({ x: 0, y: 0 })
	const [endPos, setEndPos] = useState<DragSelectPosition>({ x: 0, y: 0 })
	const dragAreaRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const { setItems: setDriveItems, items: driveItems } = useDriveItemsStore()
	const { setItems: setPublicLinkItems, items: publicLinkItems } = useDirectoryPublicLinkStore()
	const location = useLocation()

	const isInsidePublicLink = useMemo(() => {
		return location.includes("/f/") || location.includes("/d/")
	}, [location])

	const canDisplay = useMemo(() => {
		return location.includes("/drive") || isInsidePublicLink
	}, [location, isInsidePublicLink])

	const setItems = useMemo(() => {
		return isInsidePublicLink ? setPublicLinkItems : setDriveItems
	}, [isInsidePublicLink, setPublicLinkItems, setDriveItems])

	const items = useMemo(() => {
		return isInsidePublicLink ? publicLinkItems : driveItems
	}, [isInsidePublicLink, publicLinkItems, driveItems])

	const targetRects = useMemo((): Record<string, { element: HTMLDivElement; rect: DOMRect }> => {
		if (!canDisplay) {
			return {}
		}

		const rects: Record<string, { element: HTMLDivElement; rect: DOMRect }> = {}

		if (containerRef.current && items.length > 0) {
			const targets = containerRef.current.getElementsByClassName("dragselect-collision-check")
			const targetsArray = Array.from(targets)

			for (const target of targetsArray) {
				try {
					const uuid = target.getAttribute("data-uuid")

					if (uuid) {
						const targetRect = (target as HTMLDivElement).getBoundingClientRect()

						rects[uuid] = { element: target as HTMLDivElement, rect: targetRect }
					}
				} catch (e) {
					console.error(e)
				}
			}
		}

		return rects
	}, [items, canDisplay])

	const getSelectionRect = useCallback((): DOMRect => {
		if (!dragAreaRef.current || !canDisplay) {
			return new DOMRect(0, 0, 0, 0)
		}

		return dragAreaRef.current.getBoundingClientRect()
	}, [canDisplay])

	const rectOverlap = useCallback(
		(rect1: DOMRect, rect2: DOMRect): boolean => {
			if (!canDisplay) {
				return false
			}

			return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)
		},
		[canDisplay]
	)

	const checkCollision = useCallback((): void => {
		if (!canDisplay) {
			return
		}

		const selectionRect = getSelectionRect()
		const overlapped: string[] = []

		for (const uuid in targetRects) {
			const rect = targetRects[uuid]

			if (rect && rectOverlap(selectionRect, rect.rect)) {
				overlapped.push(uuid)
			}
		}

		setItems(prev =>
			prev.map(prevItem => (overlapped.includes(prevItem.uuid) ? { ...prevItem, selected: true } : { ...prevItem, selected: false }))
		)
	}, [getSelectionRect, rectOverlap, setItems, targetRects, canDisplay])

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			if (e.button !== 0 || !canDisplay) {
				return
			}

			const { clientX, clientY } = e
			const target = e.target as HTMLDivElement

			if (
				target &&
				target.className &&
				typeof target.className.includes === "function" &&
				(!target.className.includes("dragselect-start-allowed") || target.className.includes("dragselect-start-disallowed"))
			) {
				return
			}

			e.preventDefault()
			e.stopPropagation()

			setStartPos({ x: clientX, y: clientY })
			setIsDragging(true)

			setItems(prev => prev.map(prevItem => ({ ...prevItem, selected: false })))
		},
		[setItems, canDisplay]
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			if (!canDisplay) {
				return
			}

			const { clientX, clientY } = e

			if (!isDragging || startPos.x === clientX || startPos.y === clientY) {
				return
			}

			setEndPos({ x: clientX, y: clientY })

			checkCollision()
		},
		[isDragging, checkCollision, startPos, canDisplay]
	)

	const handleMouseUp = useCallback((): void => {
		if (!canDisplay) {
			return
		}

		setIsDragging(false)
		setStartPos({ x: 0, y: 0 })
		setEndPos({ x: 0, y: 0 })
	}, [canDisplay])

	const show = useMemo((): boolean => {
		return canDisplay && isDragging && startPos.x !== 0 && startPos.y !== 0 && endPos.x !== 0 && endPos.y !== 0
	}, [isDragging, startPos, endPos, canDisplay])

	const selectionBoxStyle = useMemo((): React.CSSProperties => {
		return {
			position: "absolute",
			left: show ? `${Math.min(startPos.x, endPos.x)}px` : 0,
			top: show ? `${Math.min(startPos.y, endPos.y)}px` : 0,
			width: show ? `${Math.abs(startPos.x - endPos.x)}px` : 0,
			height: show ? `${Math.abs(startPos.y - endPos.y)}px` : 0,
			backgroundColor: "rgba(0, 120, 255, 0.2)",
			border: "1px solid rgba(0, 120, 255, 0.8)",
			zIndex: show ? 999999999 : 0,
			display: show ? "flex" : "none"
		} satisfies React.CSSProperties
	}, [startPos, endPos, show])

	return (
		<div
			ref={containerRef}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			className="w-full h-full flex flex-col relative"
		>
			{show && (
				<div
					ref={dragAreaRef}
					style={selectionBoxStyle}
				/>
			)}
			{children}
		</div>
	)
})

export default DragSelect
