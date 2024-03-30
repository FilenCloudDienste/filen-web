import { memo, useState, useCallback } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { type VirtualItem } from "@tanstack/react-virtual"
import FolderIcon from "@/assets/fileExtensionIcons/svg/folder.svg?react"
import Icon from "@/components/icon"
import { formatBytes } from "@/utils"
import { directorySizeCache } from "@/cache"
import worker from "@/lib/worker"
import { setItem } from "@/lib/localForage"
import useMountedEffect from "@/hooks/useMountedEffect"

export const ListItem = memo(
	({
		item,
		virtualItem,
		setPathname
	}: {
		item: DriveCloudItem
		virtualItem: VirtualItem
		setPathname: React.Dispatch<React.SetStateAction<string>>
	}) => {
		const [size, setSize] = useState<number>(
			item.type === "directory" && directorySizeCache.has(item.uuid) ? (directorySizeCache.get(item.uuid) as number) : item.size
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

				setSize(directorySize)

				await setItem("directorySize:" + item.uuid, directorySize)
			} catch (e) {
				console.error(e)
			}
		}, [item.type, item.uuid])

		useMountedEffect(() => {
			fetchDirectorySize()
		})

		return (
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: `${virtualItem.size}px`,
					transform: `translateY(${virtualItem.start}px)`
				}}
				className="flex flex-row justify-between items-center hover:bg-secondary cursor-pointer px-3 rounded-lg gap-5 select-none"
				onClick={() => setPathname(prev => `${prev}/${item.uuid}`)}
			>
				<div className="flex flex-row items-center gap-3 text-primary line-clamp-1 text-ellipsis select-none">
					<FolderIcon
						style={{
							width: 28,
							height: 28,
							flexShrink: 0
						}}
					/>
					<p className="line-clamp-1 text-ellipsis select-none">{item.name}</p>
				</div>
				<div className="flex flex-row items-center gap-2 text-primary shrink-0 select-none">
					<p>{formatBytes(size)}</p>
					<Icon
						name="chevron-right"
						size={18}
					/>
				</div>
			</div>
		)
	}
)

export default ListItem
