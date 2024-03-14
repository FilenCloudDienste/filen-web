import { useState, useCallback, useMemo, memo, useRef } from "react"
import { useDriveItemsStore } from "@/stores/drive.store"
import throttle from "lodash/throttle"

export type DragSelectPosition = { x: number; y: number }

const DragSelect = memo(({ children }: { children: React.ReactNode }) => {
	const [isDragging, setIsDragging] = useState<boolean>(false)
	const [startPos, setStartPos] = useState<DragSelectPosition>({ x: 0, y: 0 })
	const [endPos, setEndPos] = useState<DragSelectPosition>({ x: 0, y: 0 })
	const dragAreaRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const { setItems } = useDriveItemsStore()

	const getSelectionRect = useCallback((): DOMRect => {
		if (!dragAreaRef.current) {
			return new DOMRect(0, 0, 0, 0)
		}

		return dragAreaRef.current.getBoundingClientRect()
	}, [])

	const rectOverlap = useCallback((rect1: DOMRect, rect2: DOMRect): boolean => {
		return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)
	}, [])

	const checkCollisionThrottled = useRef(
		throttle(
			(): void => {
				checkCollision()
			},
			1,
			{
				trailing: true,
				leading: false
			}
		)
	).current

	const checkCollision = useCallback((): void => {
		if (!containerRef.current) {
			return
		}

		const targets = containerRef.current.getElementsByClassName("dragselect-collision-check")
		const selectionRect = getSelectionRect()
		const overlapped: string[] = []
		const targetsArray = Array.from(targets)

		for (const target of targetsArray) {
			try {
				const targetRect = (target as HTMLDivElement).getBoundingClientRect()

				if (rectOverlap(selectionRect, targetRect)) {
					const targetUUID = target.getAttribute("data-uuid")

					if (targetUUID) {
						overlapped.push(targetUUID)
					}
				}
			} catch (e) {
				console.error(e)
			}
		}

		setItems(prev =>
			prev.map(prevItem => (overlapped.includes(prevItem.uuid) ? { ...prevItem, selected: true } : { ...prevItem, selected: false }))
		)
	}, [getSelectionRect, rectOverlap, setItems])

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			if (e.button !== 0) {
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

			setItems(prev => prev.map(prevItem => ({ ...prevItem, selected: false })))
			setStartPos({ x: clientX, y: clientY })
			setIsDragging(true)
		},
		[setItems]
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>): void => {
			const { clientX, clientY } = e

			if (!isDragging || startPos.x === clientX || startPos.y === clientY) {
				return
			}

			setEndPos({ x: clientX, y: clientY })

			checkCollisionThrottled()
		},
		[isDragging, checkCollisionThrottled, startPos]
	)

	const handleMouseUp = useCallback((): void => {
		setIsDragging(false)
		setStartPos({ x: 0, y: 0 })
		setEndPos({ x: 0, y: 0 })
	}, [])

	const show = useMemo((): boolean => {
		return isDragging && startPos.x !== 0 && startPos.y !== 0 && endPos.x !== 0 && endPos.y !== 0
	}, [isDragging, startPos, endPos])

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
		<>
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
		</>
	)
})

export default DragSelect
