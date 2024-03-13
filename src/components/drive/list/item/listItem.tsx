import { memo, useCallback, useState, useEffect } from "react"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { type DriveCloudItem } from "../.."
import { useRouterState, useNavigate } from "@tanstack/react-router"
import { type VirtualItem } from "@tanstack/react-virtual"
import { fileNameToSVGIcon, folderIcon } from "@/assets/fileExtensionIcons"
import { simpleDate, formatBytes } from "@/utils"
import ContextMenu from "./contextMenu"
import worker from "@/lib/worker"
import { directorySizeCache } from "@/cache"
import { set } from "idb-keyval"

let draggedItems: DriveCloudItem[] = []

export const ListItem = memo(
	({ item, virtualItem, items }: { item: DriveCloudItem; virtualItem: VirtualItem; items: DriveCloudItem[] }) => {
		const { setItems } = useDriveItemsStore()
		const { currentReceiverId, currentSharerId, setCurrentReceiverId, setCurrentSharerId } = useDriveSharedStore()
		const routerState = useRouterState()
		const navigate = useNavigate()
		const [hovering, setHovering] = useState<boolean>(false)
		const [size, setSize] = useState<number>(
			item.type === "directory" && directorySizeCache.has(item.uuid) ? (directorySizeCache.get(item.uuid) as number) : item.size
		)

		const onClick = useCallback(
			(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				if (e.shiftKey) {
					const firstIndex = items.findIndex(item => item.selected === true)

					if (firstIndex === virtualItem.index) {
						return
					}

					const start = firstIndex < virtualItem.index ? firstIndex : virtualItem.index
					const end = virtualItem.index > firstIndex ? virtualItem.index : firstIndex

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
			[items, setItems, item.uuid, virtualItem.index]
		)

		const onDoubleClick = useCallback(() => {
			if (item.type === "directory" && !routerState.location.pathname.includes("trash")) {
				setCurrentReceiverId(item.receiverId)
				setCurrentSharerId(item.sharerId)

				navigate({
					to: "/drive/$",
					params: {
						_splat: `${routerState.location.pathname.split("/drive/").join("")}/${item.uuid}`
					}
				})

				return
			}
		}, [
			item.type,
			routerState.location.pathname,
			navigate,
			item.uuid,
			item.receiverId,
			item.sharerId,
			setCurrentReceiverId,
			setCurrentSharerId
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
		}, [items, item])

		const onDragOver = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault()

				setHovering(draggedItems.length > 0 && item.type === "directory")
			},
			[item.type]
		)

		const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			setHovering(false)
		}, [])

		const onDrop = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault()

				setHovering(false)

				if (item.type !== "directory" || draggedItems.length === 0) {
					return
				}

				const draggedItemsUUIDs = draggedItems.map(item => item.uuid)

				if (draggedItemsUUIDs.includes(item.uuid)) {
					return
				}

				console.log("move", item.uuid, draggedItems.length)
			},
			[item.type, item.uuid]
		)

		const fetchDirectorySize = useCallback(() => {
			if (item.type !== "directory") {
				return
			}

			// eslint-disable-next-line no-extra-semi
			;(async () => {
				try {
					const directorySize = await worker.directorySize({
						uuid: item.uuid,
						trash: routerState.location.pathname.includes("trash"),
						sharerId: currentSharerId,
						receiverId: currentReceiverId
					})

					directorySizeCache.set(item.uuid, directorySize)

					setSize(directorySize)

					await set("directorySize:" + item.uuid, directorySize)
				} catch (e) {
					console.error(e)
				}
			})()
		}, [item.type, item.uuid, routerState.location.pathname, currentSharerId, currentReceiverId])

		useEffect(() => {
			fetchDirectorySize()
		}, [fetchDirectorySize])

		return (
			<div
				className="flex flex-row select-none dragselect-start-disallowed"
				key={virtualItem.key}
				draggable={true}
				data-uuid={item.uuid}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: `${virtualItem.size}px`,
					transform: `translateY(${virtualItem.start}px)`
				}}
				onClick={onClick}
				onDoubleClick={onDoubleClick}
				onContextMenu={onContextMenu}
				onDragStart={onDragStart}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				<ContextMenu item={item}>
					<div
						className={
							"dragselect-collision-check dragselect-start-disallowed flex flex-row w-full h-11 items-center justify-between gap-3 text-medium hover:bg-secondary cursor-pointer px-3 " +
							(item.selected || hovering ? "bg-secondary" : "")
						}
						data-uuid={item.uuid}
					>
						<div className="flex flex-row grow items-center dragselect-start-disallowed line-clamp-1 text-ellipsis gap-2">
							<div className="flex flex-row dragselect-start-disallowed shrink-0">
								<img
									src={item.type === "directory" ? folderIcon : fileNameToSVGIcon(item.name)}
									className={"w-7 h-7 dragselect-start-disallowed shrink-0"}
								/>
							</div>
							<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{item.name}</p>
						</div>
						<div className="flex flex-row w-[150px] dragselect-start-disallowed line-clamp-1 text-ellipsis">
							<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{formatBytes(size)}</p>
						</div>
						<div className="flex flex-row w-[220px] dragselect-start-disallowed line-clamp-1 text-ellipsis">
							<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{simpleDate(item.lastModified)}</p>
						</div>
					</div>
				</ContextMenu>
			</div>
		)
	}
)

export default ListItem
