import { memo, useState, useCallback, useRef, useMemo } from "react"
import { type DriveCloudItem } from "@/components/drive"
import FolderIcon from "@/assets/fileExtensionIcons/svg/folder.svg?react"
import { ChevronRight } from "lucide-react"
import { formatBytes } from "@/utils"
import { directorySizeCache, thumbnailURLObjectCache } from "@/cache"
import worker from "@/lib/worker"
import { setItem } from "@/lib/localForage"
import useMountedEffect from "@/hooks/useMountedEffect"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { type SelectionType } from ".."

export const ListItem = memo(
	({
		item,
		setPathname,
		responseItems,
		setResponseItems,
		selectMultiple,
		selectionType
	}: {
		item: DriveCloudItem
		setPathname: React.Dispatch<React.SetStateAction<string>>
		responseItems: DriveCloudItem[]
		setResponseItems: React.Dispatch<React.SetStateAction<DriveCloudItem[]>>
		selectionType: SelectionType
		selectMultiple: boolean
	}) => {
		const [size, setSize] = useState<number>(
			item.type === "directory" && directorySizeCache.has(item.uuid) ? (directorySizeCache.get(item.uuid) as number) : item.size
		)
		const thumbnailURL = useRef<string | null>(
			thumbnailURLObjectCache.has(item.uuid) ? thumbnailURLObjectCache.get(item.uuid)! : null
		).current

		const fetchDirectorySize = useCallback(async () => {
			if (item.type !== "directory") {
				return
			}

			try {
				const directorySize = await worker.directorySize({
					uuid: item.uuid
				})

				directorySizeCache.set(item.uuid, directorySize)

				setSize(directorySize)

				await setItem("directorySize:" + item.uuid, directorySize)
			} catch (e) {
				console.error(e)
			}
		}, [item.type, item.uuid])

		const canSelect = useMemo(() => {
			const allowedTypes: SelectionType[] =
				selectionType === "all" ? ["directory", "file"] : selectionType === "directory" ? ["directory"] : ["file"]

			return allowedTypes.includes(item.type)
		}, [selectionType, item.type])

		const isSelected = useMemo(() => {
			return responseItems.some(i => i.uuid === item.uuid)
		}, [responseItems, item.uuid])

		const selectItem = useCallback(
			(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
				e.preventDefault()
				e.stopPropagation()

				if (isSelected) {
					setResponseItems(prev => prev.filter(i => i.uuid !== item.uuid))
				} else {
					if (!canSelect) {
						return
					}

					if (!selectMultiple) {
						setResponseItems([item])
					} else {
						setResponseItems(prev => [...prev.filter(i => i.uuid !== item.uuid), item])
					}
				}
			},
			[item, isSelected, setResponseItems, canSelect, selectMultiple]
		)

		const navigateToDirectory = useCallback(
			(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				e.preventDefault()
				e.stopPropagation()

				if (item.type !== "directory") {
					if (canSelect) {
						selectItem(e as unknown as React.MouseEvent<HTMLButtonElement, MouseEvent>)
					}

					return
				}

				setResponseItems([])
				setPathname(prev => `${prev}/${item.uuid}`)
			},
			[item.type, item.uuid, setPathname, canSelect, selectItem, setResponseItems]
		)

		useMountedEffect(() => {
			fetchDirectorySize()
		})

		return (
			<div
				className="flex flex-row justify-between items-center hover:bg-secondary cursor-pointer px-3 py-2 rounded-md gap-5 select-none"
				onClick={navigateToDirectory}
			>
				<div className="flex flex-row items-center gap-3 text-primary line-clamp-1 text-ellipsis select-none">
					<Checkbox
						onClick={selectItem}
						checked={isSelected}
						disabled={!canSelect}
					/>
					{item.type === "directory" ? (
						<FolderIcon
							className={cn("shrink-0", !canSelect && "opacity-50")}
							style={{
								width: 28,
								height: 28,
								flexShrink: 0
							}}
						/>
					) : (
						<img
							src={thumbnailURL ? thumbnailURL : fileNameToSVGIcon(item.name)}
							className={cn(
								"w-[28px] h-[28px] dragselect-start-disallowed shrink-0",
								thumbnailURL && "rounded-sm",
								!canSelect && "opacity-50"
							)}
							draggable={false}
						/>
					)}
					<p className={cn("line-clamp-1 text-ellipsis select-none", !canSelect && "opacity-50")}>{item.name}</p>
				</div>
				<div className={cn("flex flex-row items-center gap-2 text-primary shrink-0 select-none", !canSelect && "opacity-50")}>
					<p>{formatBytes(size)}</p>
					{item.type === "directory" && <ChevronRight size={18} />}
				</div>
			</div>
		)
	}
)

export default ListItem
