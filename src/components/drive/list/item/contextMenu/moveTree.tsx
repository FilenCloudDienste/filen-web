import { memo, useCallback } from "react"
import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { useDriveItemsStore } from "@/stores/drive.store"
import { type DriveCloudItem } from "@/components/drive"

export const MoveTree = memo(({ parent, name }: { parent: string; name: string }) => {
	const { items } = useDriveItemsStore()

	const query = useQuery({
		queryKey: ["listDirectoryOnlyDirectories", parent],
		queryFn: () =>
			new Promise<DriveCloudItem[]>((resolve, reject) => {
				worker
					.listDirectory({ uuid: parent, onlyDirectories: true })
					.then(res => resolve(res.filter(item => item.type === "directory")))
					.catch(reject)
			})
	})

	const move = useCallback(
		(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.stopPropagation()

			// Workaround to hide the context menu.
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

			const selectedItems = items.filter(item => item.selected)

			console.log(selectedItems, parent)
		},
		[items, parent]
	)

	return (
		<ContextMenuSub>
			{query.isSuccess && query.data.length === 0 ? (
				<ContextMenuItem
					onClick={move}
					className="cursor-pointer"
				>
					{name}
				</ContextMenuItem>
			) : !query.isSuccess ? (
				<ContextMenuItem
					onClick={e => {
						e.preventDefault()
						e.stopPropagation()
					}}
					className="cursor-pointer"
				>
					<LoaderIcon
						size={18}
						className="animate-spin-medium"
					/>
				</ContextMenuItem>
			) : (
				<>
					<ContextMenuSubTrigger
						onClick={move}
						className="cursor-pointer"
					>
						{name}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{query.data.map(item => {
							return (
								<MoveTree
									parent={item.uuid}
									key={item.uuid}
									name={item.name}
								/>
							)
						})}
					</ContextMenuSubContent>
				</>
			)}
		</ContextMenuSub>
	)
})

export default MoveTree
