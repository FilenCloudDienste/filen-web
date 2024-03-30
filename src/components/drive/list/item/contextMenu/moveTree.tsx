import { memo, useCallback, useMemo } from "react"
import { ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuItem } from "@/components/ui/context-menu"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import Icon from "@/components/icon"
import { useDriveItemsStore } from "@/stores/drive.store"
import { move as moveAction } from "./actions"
import { orderItemsByType } from "@/components/drive/utils"

export const MoveTree = memo(({ parent, name }: { parent: string; name: string }) => {
	const { items, setItems } = useDriveItemsStore()

	const query = useQuery({
		queryKey: ["listDirectoryOnlyDirectories", parent],
		queryFn: () => worker.listDirectory({ uuid: parent, onlyDirectories: true })
	})

	const selectedItems = useMemo(() => {
		return items.filter(item => item.selected)
	}, [items])

	const itemsSorted = useMemo(() => {
		if (!query.isSuccess) {
			return []
		}

		return orderItemsByType({ items: query.data, type: "nameAsc" })
	}, [query.isSuccess, query.data])

	const canMove = useMemo(() => {
		const selectedItemsUUIDs = selectedItems.map(item => item.uuid)

		return !selectedItemsUUIDs.includes(parent)
	}, [parent, selectedItems])

	const move = useCallback(
		async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.stopPropagation()

			// Workaround to hide the context menu.
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

			if (selectedItems.length === 0 || !canMove) {
				return
			}

			try {
				const itemsToMove = selectedItems.filter(item => item.parent !== parent)

				await moveAction({ selectedItems: itemsToMove, parent })

				const movedUUIDs = itemsToMove.map(item => item.uuid)

				setItems(prev => prev.filter(prevItem => !movedUUIDs.includes(prevItem.uuid)))
			} catch (e) {
				console.error(e)
			}
		},
		[selectedItems, parent, setItems, canMove]
	)

	if (!canMove) {
		return
	}

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
					<Icon
						name="loader"
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
						{itemsSorted.map(item => {
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
