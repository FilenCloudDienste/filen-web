import { memo, useState, useRef, useCallback, useEffect } from "react"
import { Loader } from "."
import { thumbnailURLObjectCache } from "@/cache"
import { type DriveCloudItem } from "@/components/drive"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { LoaderIcon } from "lucide-react"
import { useTheme } from "@/providers/themeProvider"

const ZOOM_SPEED = 0.1

export const Image = memo(({ urlObject, item }: { urlObject?: string; item: DriveCloudItem }) => {
	const [imageZoom, setImageZoom] = useState<number>(1)
	const [imagePosition, setImagePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
	const ref = useRef<HTMLImageElement>(null)
	const [pressed, setPressed] = useState<boolean>(false)
	const publicLinkURLState = usePublicLinkURLState()
	const { dark } = useTheme()
	const prevItemUUIDRef = useRef<string>("")

	const onMouseDown = useCallback(() => {
		setPressed(true)
	}, [])

	const onMouseUp = useCallback(() => {
		setPressed(false)
	}, [])

	const onMouseLeave = useCallback(() => {
		setPressed(false)
	}, [])

	const onMouseMove = useCallback(
		(e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
			if (!pressed) {
				return
			}

			setImagePosition(prev => ({
				x: prev.x + e.movementX,
				y: prev.y + e.movementY
			}))
		},
		[pressed]
	)

	const onWheel = useCallback(
		(e: React.WheelEvent<HTMLImageElement>) => {
			if (publicLinkURLState.isPublicLink && publicLinkURLState.chatEmbed) {
				return
			}

			if (e.deltaY > 0) {
				setImageZoom(prev => {
					const newZoom = prev + ZOOM_SPEED

					return newZoom
				})
			} else {
				setImageZoom(prev => {
					let newZoom = prev - ZOOM_SPEED

					if (newZoom <= 0.1) {
						newZoom = 0.1
					}

					return newZoom
				})
			}
		},
		[publicLinkURLState.isPublicLink, publicLinkURLState.chatEmbed]
	)

	const onDoubleClick = useCallback(() => {
		setImagePosition({
			x: 0,
			y: 0
		})

		if (imageZoom <= 1) {
			setImageZoom(2)
		} else {
			setImageZoom(1)
		}
	}, [imageZoom])

	useEffect(() => {
		if (item.uuid !== prevItemUUIDRef.current) {
			prevItemUUIDRef.current = item.uuid

			setImageZoom(1)
			setImagePosition({
				x: 0,
				y: 0
			})
		}
	}, [item])

	return (
		<>
			{!urlObject && !thumbnailURLObjectCache.has(item.uuid) ? (
				<Loader />
			) : (
				<div
					className={cn(
						"w-full h-full flex flex-row items-center justify-center",
						!publicLinkURLState.isPublicLink && (dark ? "bg-black" : "bg-white")
					)}
				>
					{!urlObject && (
						<div className="w-full h-full absolute flex flex-row items-center justify-center z-50">
							<LoaderIcon
								className="animate-spin-medium text-white"
								size={30}
							/>
						</div>
					)}
					<img
						ref={ref}
						src={urlObject ? urlObject : thumbnailURLObjectCache.get(item.uuid)}
						className={cn(
							"max-w-full object-contain z-10",
							publicLinkURLState.isPublicLink
								? publicLinkURLState.chatEmbed
									? "max-h-[100dvh] cursor-pointer"
									: "max-h-[calc(100dvh-56px)] cursor-zoom-in"
								: "max-h-[calc(100dvh-48px)] cursor-zoom-in"
						)}
						draggable={false}
						style={{
							transform: "scale(" + imageZoom + ") translate(" + imagePosition.x + "px, " + imagePosition.y + "px)"
						}}
						onMouseDown={onMouseDown}
						onMouseUp={onMouseUp}
						onMouseLeave={onMouseLeave}
						onMouseMove={onMouseMove}
						onWheel={onWheel}
						onDoubleClick={onDoubleClick}
					/>
				</div>
			)}
		</>
	)
})

export default Image
