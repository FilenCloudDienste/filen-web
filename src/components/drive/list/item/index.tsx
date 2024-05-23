import { memo, useCallback, useState, useMemo } from "react"
import { type DriveCloudItem } from "../.."
import { fileNameToSVGIcon, ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
import { simpleDate, formatBytes } from "@/utils"
import ContextMenu from "./contextMenu"
import worker from "@/lib/worker"
import { directorySizeCache, thumbnailURLObjectCache } from "@/cache"
import { setItem } from "@/lib/localForage"
import eventEmitter from "@/lib/eventEmitter"
import { generateThumbnail } from "@/lib/worker/proxy"
import { fileNameToThumbnailType, fileNameToPreviewType } from "@/components/dialogs/previewDialog/utils"
import { cn } from "@/lib/utils"
import { Heart } from "lucide-react"
import useMountedEffect from "@/hooks/useMountedEffect"
import { THUMBNAIL_MAX_FETCH_SIZE } from "@/constants"
import { Badge } from "@/components/ui/badge"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { useDriveSharedStore, useDriveItemsStore } from "@/stores/drive.store"
import { useNavigate } from "@tanstack/react-router"
import useLocation from "@/hooks/useLocation"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"

let draggedItems: DriveCloudItem[] = []

export const ListItem = memo(({ item, index, type }: { item: DriveCloudItem; index: number; type: "list" | "grid" }) => {
	const {
		currentReceiverId,
		currentSharerId,
		setCurrentReceiverId,
		setCurrentSharerId,
		setCurrentReceiverEmail,
		setCurrentReceivers,
		setCurrentSharerEmail
	} = useDriveSharedStore()
	const navigate = useNavigate()
	const location = useLocation()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const { setItems: setDriveItems, items: driveItems } = useDriveItemsStore()
	const { setItems: setPublicLinkItems, items: publicLinkItems, setVirtualURL } = useDirectoryPublicLinkStore()
	const [hovering, setHovering] = useState<boolean>(false)
	const [size, setSize] = useState<number>(
		item.type === "directory" && directorySizeCache.has(item.uuid) ? (directorySizeCache.get(item.uuid) as number) : item.size
	)
	const [thumbnailURL, setThumbnailURL] = useState<string | null>(
		thumbnailURLObjectCache.has(item.uuid) ? thumbnailURLObjectCache.get(item.uuid)! : null
	)
	const [navigating, setNavigating] = useState<boolean>(false)
	const publicLinkURLState = usePublicLinkURLState()

	const previewType = useMemo(() => {
		return fileNameToPreviewType(item.name)
	}, [item.name])

	const isInsidePublicLink = useMemo(() => {
		return location.includes("/f/") || location.includes("/d/")
	}, [location])

	const setItems = useMemo(() => {
		return isInsidePublicLink ? setPublicLinkItems : setDriveItems
	}, [isInsidePublicLink, setPublicLinkItems, setDriveItems])

	const items = useMemo(() => {
		return isInsidePublicLink ? publicLinkItems : driveItems
	}, [isInsidePublicLink, publicLinkItems, driveItems])

	const onClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			if (e.shiftKey) {
				const firstIndex = items.findIndex(item => item.selected === true)

				if (firstIndex === index) {
					return
				}

				const start = firstIndex < index ? firstIndex : index
				const end = index > firstIndex ? index : firstIndex

				setItems(prev =>
					prev.map((prevItem, index) => (index >= start && index <= end ? { ...prevItem, selected: true } : prevItem))
				)

				return
			}

			setItems(prev => {
				const selected = prev.filter(item => item.selected).length

				return prev.map(prevItem =>
					prevItem.uuid === item.uuid
						? {
								...prevItem,
								selected: e.ctrlKey || e.metaKey ? !prevItem.selected : selected > 1 ? true : !prevItem.selected
							}
						: {
								...prevItem,
								selected: e.ctrlKey || e.metaKey ? prevItem.selected : false
							}
				)
			})
		},
		[items, setItems, item.uuid, index]
	)

	const onDoubleClick = useCallback(() => {
		if (item.type === "file" && previewType !== "other") {
			eventEmitter.emit("openPreviewModal", { item })

			return
		}

		if (item.type === "directory" && !location.includes("trash")) {
			setNavigating(true)
			setCurrentReceiverId(item.receiverId)
			setCurrentReceiverEmail(item.receiverEmail)
			setCurrentSharerId(item.sharerId)
			setCurrentSharerEmail(item.sharerEmail)
			setCurrentReceivers(item.receivers)

			if (isInsidePublicLink && setVirtualURL) {
				setVirtualURL(prev => `${prev}/${item.uuid}`)
			} else {
				navigate({
					to: "/drive/$",
					params: {
						_splat: `${location.split("/drive/").join("")}/${item.uuid}`
					}
				})
			}

			return
		}
	}, [
		item,
		location,
		navigate,
		setCurrentReceiverId,
		setCurrentSharerId,
		setCurrentReceivers,
		setCurrentReceiverEmail,
		setCurrentSharerEmail,
		previewType,
		setVirtualURL,
		isInsidePublicLink
	])

	const onContextMenu = useCallback(() => {
		setItems(prev => {
			const selected = prev.filter(item => item.selected).length

			return prev.map(prevItem =>
				prevItem.uuid === item.uuid
					? {
							...prevItem,
							selected: true
						}
					: {
							...prevItem,
							selected: selected > 1 ? prevItem.selected : false
						}
			)
		})
	}, [setItems, item.uuid])

	const onDragStart = useCallback(() => {
		if (isInsidePublicLink) {
			return
		}

		const selectedItems: DriveCloudItem[] = []
		const exists: Record<string, boolean> = {}

		for (const itm of items) {
			if (!itm.selected) {
				continue
			}

			selectedItems.push(itm)
			exists[item.uuid] = true
		}

		if (!exists[item.uuid]) {
			selectedItems.push(item)
		}

		draggedItems = selectedItems
	}, [items, item, isInsidePublicLink])

	const onDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (isInsidePublicLink) {
				return
			}

			setHovering(draggedItems.length > 0 && item.type === "directory")
		},
		[item.type, isInsidePublicLink]
	)

	const onDragLeave = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (isInsidePublicLink) {
				return
			}

			setHovering(false)
		},
		[isInsidePublicLink]
	)

	const onDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (isInsidePublicLink) {
				return
			}

			setHovering(false)

			if (item.type !== "directory" || draggedItems.length === 0) {
				return
			}

			const draggedItemsUUIDs = draggedItems.map(item => item.uuid)

			if (draggedItemsUUIDs.includes(item.uuid)) {
				return
			}

			try {
				await worker.moveItems({ items: draggedItems, parent: item.uuid })

				setItems(prev => prev.filter(item => !draggedItemsUUIDs.includes(item.uuid)))
			} catch (e) {
				console.error(e)
			}
		},
		[item.type, item.uuid, setItems, isInsidePublicLink]
	)

	const fetchDirectorySize = useCallback(async () => {
		if (item.type !== "directory") {
			return
		}

		try {
			const directorySize = await worker.directorySize({
				uuid: item.uuid,
				trash: location.includes("trash"),
				sharerId: currentSharerId,
				receiverId: currentReceiverId,
				linkUUID: isInsidePublicLink ? publicLinkURLState.uuid : undefined
			})

			directorySizeCache.set(item.uuid, directorySize)

			setSize(directorySize)

			await setItem("directorySize:" + item.uuid, directorySize)
		} catch (e) {
			console.error(e)
		}
	}, [item.type, item.uuid, location, currentSharerId, currentReceiverId, isInsidePublicLink, publicLinkURLState.uuid])

	const fetchThumbnail = useCallback(async () => {
		if (thumbnailURL) {
			return
		}

		const thumbnailType = fileNameToThumbnailType(item.name)

		if (thumbnailType === "none" || item.size > THUMBNAIL_MAX_FETCH_SIZE) {
			return
		}

		try {
			const urlObject = await generateThumbnail({ item })

			setThumbnailURL(urlObject)
		} catch (e) {
			console.error(e)
		}
	}, [item, thumbnailURL])

	const onReceiversClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.preventDefault()
			e.stopPropagation()

			if (isInsidePublicLink) {
				return
			}

			eventEmitter.emit("openSharedWithDialog", item)
		},
		[item, isInsidePublicLink]
	)

	const removeShared = useCallback(
		async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.preventDefault()
			e.stopPropagation()

			if (isInsidePublicLink) {
				return
			}

			if (!e.shiftKey) {
				if (
					!(await showConfirmDialog({
						title: "d",
						continueButtonText: "ddd",
						description: "ookeoetrasher",
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			const toast = loadingToast()

			try {
				await worker.removeSharedItem({ uuid: item.uuid })

				if (location.includes("shared-in")) {
					setItems(prev => prev.filter(itm => itm.uuid !== item.uuid))
				}
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[errorToast, loadingToast, setItems, item.uuid, location, isInsidePublicLink]
	)

	useMountedEffect(() => {
		fetchDirectorySize()
		fetchThumbnail()
	})

	return (
		<div
			className={cn("flex select-none dragselect-start-disallowed", type === "list" ? "flex-row" : "flex-col")}
			draggable={!isInsidePublicLink}
			data-uuid={item.uuid}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
			onContextMenu={onContextMenu}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<ContextMenu
				item={item}
				items={items}
			>
				{type === "list" ? (
					<div
						className={cn(
							"dragselect-collision-check dragselect-start-disallowed flex flex-row w-full h-11 items-center justify-between gap-3 text-medium hover:bg-secondary cursor-pointer px-3",
							item.selected || hovering ? "bg-secondary" : "",
							navigating && "animate-pulse bg-secondary"
						)}
						data-uuid={item.uuid}
					>
						<div className="flex flex-row grow items-center dragselect-start-disallowed line-clamp-1 text-ellipsis gap-2 min-w-[200px]">
							<div className="flex flex-row dragselect-start-disallowed shrink-0">
								{item.type === "directory" ? (
									<ColoredFolderSVGIcon
										width="1.75rem"
										height="1.75rem"
										color={item.color}
									/>
								) : (
									<img
										src={thumbnailURL ? thumbnailURL : fileNameToSVGIcon(item.name)}
										className={cn(
											"w-7 h-7 dragselect-start-disallowed shrink-0 object-cover",
											thumbnailURL ? "rounded-sm" : ""
										)}
										draggable={false}
									/>
								)}
							</div>
							<div className="flex flex-row grow dragselect-start-disallowed items-center gap-2">
								{item.favorited && (
									<Heart
										size={18}
										className="dragselect-start-disallowed shrink-0"
									/>
								)}
								<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis break-all">{item.name}</p>
							</div>
							{item.sharerId > 0 && item.sharerEmail.length > 0 && (
								<div className="flex flex-row items-center pr-2">
									<Badge
										className="line-clamp-1 text-ellipsis break-all cursor-pointer"
										variant="default"
										onClick={removeShared}
									>
										{item.sharerEmail}
									</Badge>
								</div>
							)}
							{item.receivers.length > 0 && (
								<div className="flex flex-row items-center pr-2">
									<Badge
										className="line-clamp-1 text-ellipsis break-all cursor-pointer"
										onClick={onReceiversClick}
										variant="default"
									>
										{item.receivers.length === 1
											? item.receivers[0].email
											: t("drive.list.item.sharedWith", { count: item.receivers.length })}
									</Badge>
								</div>
							)}
						</div>
						<div className="flex flex-row dragselect-start-disallowed line-clamp-1 text-ellipsis w-[125px]">
							<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis break-all">{formatBytes(size)}</p>
						</div>
						<div className="flex flex-row dragselect-start-disallowed line-clamp-1 text-ellipsis w-[250px]">
							<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis break-all">
								{simpleDate(item.lastModified)}
							</p>
						</div>
					</div>
				) : (
					<div
						className={cn(
							"dragselect-collision-check dragselect-start-disallowed flex flex-col w-[200px] h-[200px] p-3",
							navigating && "animate-pulse"
						)}
						data-uuid={item.uuid}
					>
						<div className="dragselect-start-disallowed absolute flex flex-row justify-center items-center mt-[140px] w-[176px]">
							<div
								className={cn(
									"flex flex-row max-w-[150px] h-full items-center rounded-full px-[8px] py-[3px] justify-center",
									thumbnailURL ? (item.selected || hovering ? "bg-secondary" : "bg-primary-foreground") : "",
									navigating && "bg-secondary"
								)}
							>
								<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis break-all">{item.name}</p>
							</div>
						</div>
						<div
							className={cn(
								"flex flex-col dragselect-start-disallowed w-full rounded-md border h-full hover:bg-secondary cursor-pointer items-center justify-center",
								item.selected || hovering ? "bg-secondary border-primary" : ""
							)}
						>
							{item.type === "directory" ? (
								<ColoredFolderSVGIcon
									width="4rem"
									height="4rem"
									color={item.color}
								/>
							) : (
								<img
									src={thumbnailURL ? thumbnailURL : fileNameToSVGIcon(item.name)}
									className={cn(
										"dragselect-start-disallowed shrink-0 rounded-md object-cover",
										thumbnailURL ? "w-full h-full" : "w-16 h-16"
									)}
									draggable={false}
								/>
							)}
						</div>
					</div>
				)}
			</ContextMenu>
		</div>
	)
})

export default ListItem
