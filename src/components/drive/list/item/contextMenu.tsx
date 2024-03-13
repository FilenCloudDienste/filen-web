import { memo, useMemo } from "react"
import { ContextMenu as CM, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { type DriveCloudItem } from "../.."
import { downloadFile } from "@/lib/worker/proxy"
import { useDriveItemsStore } from "@/stores/drive.store"

export const ContextMenu = memo(({ item, children }: { item: DriveCloudItem; children: React.ReactNode }) => {
	const { items } = useDriveItemsStore()

	const selectedItems = useMemo(() => {
		return items.filter(item => item.selected)
	}, [items])

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				{selectedItems.length > 1 ? (
					<ContextMenuItem onClick={() => downloadFile({ item })}>Download multi</ContextMenuItem>
				) : (
					<ContextMenuItem onClick={() => downloadFile({ item })}>Download</ContextMenuItem>
				)}
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
