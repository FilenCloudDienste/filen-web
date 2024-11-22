import { memo, useState, useCallback, useMemo } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { ChevronRight } from "lucide-react"
import { formatBytes } from "@/utils"
import { directorySizeCache, thumbnailURLObjectCache, directoryUUIDToNameCache } from "@/cache"
import worker from "@/lib/worker"
import { setItem } from "@/lib/localForage"
import useMountedEffect from "@/hooks/useMountedEffect"
import { fileNameToSVGIcon, ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { type SelectionType, type ResponseItem } from ".."
import pathModule from "path"
import useSDKConfig from "@/hooks/useSDKConfig"
import { validate as validateUUID } from "uuid"

export const ListItem = memo(
	({
		item,
		setPathname,
		responseItems,
		setResponseItems,
		selectMultiple,
		selectionType,
		pathname
	}: {
		item: DriveCloudItem
		setPathname: React.Dispatch<React.SetStateAction<string>>
		responseItems: ResponseItem[]
		setResponseItems: React.Dispatch<React.SetStateAction<ResponseItem[]>>
		selectionType: SelectionType
		selectMultiple: boolean
		pathname: string
	}) => {
		const { baseFolderUUID } = useSDKConfig()
		const [size, setSize] = useState<number>(
			item.type === "directory" && directorySizeCache.has(item.uuid) ? directorySizeCache.get(item.uuid)!.size : item.size
		)
		const thumbnailURL = useMemo(
			() => (thumbnailURLObjectCache.has(item.uuid) ? thumbnailURLObjectCache.get(item.uuid)! : null),
			[item.uuid]
		)

		const fetchDirectorySize = useCallback(async () => {
			if (item.type !== "directory") {
				return
			}

			try {
				const directorySize = await worker.directorySize({
					uuid: item.uuid
				})

				directorySizeCache.set(item.uuid, directorySize)

				setSize(directorySize.size)

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

		const currentPath = useMemo(() => {
			const ex = pathname.split("/")
			let built = ""

			for (const part of ex) {
				if (part.length === 0 || !validateUUID(part)) {
					continue
				}

				if (part === baseFolderUUID) {
					continue
				}

				if (directoryUUIDToNameCache.has(part)) {
					built = pathModule.posix.join(built, directoryUUIDToNameCache.get(part)!)
				}
			}

			return built.startsWith("/") ? built : `/${built}`
		}, [pathname, baseFolderUUID])

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
						setResponseItems([
							{
								...item,
								path: pathModule.posix.join(currentPath, item.name)
							}
						])
					} else {
						setResponseItems(prev => [
							...prev.filter(i => i.uuid !== item.uuid),
							{
								...item,
								path: pathModule.posix.join(currentPath, item.name)
							}
						])
					}
				}
			},
			[item, isSelected, setResponseItems, canSelect, selectMultiple, currentPath]
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
						className="mr-1 shrink-0"
					/>
					{item.type === "directory" ? (
						<ColoredFolderSVGIcon
							width="28px"
							height="28px"
							color={item.color}
						/>
					) : (
						<img
							src={thumbnailURL ? thumbnailURL : fileNameToSVGIcon(item.name)}
							className={cn(
								"w-[28px] h-[28px] shrink-0 object-cover",
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
