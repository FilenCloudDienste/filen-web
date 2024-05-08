import { memo, useRef } from "react"
import { type DriveCloudItem } from "../../drive"
import { useVirtualizer } from "@tanstack/react-virtual"
import Receiver from "./receiver"

export const List = memo(
	({
		item,
		setItem,
		setOpen
	}: {
		item: DriveCloudItem
		setItem: React.Dispatch<React.SetStateAction<DriveCloudItem | null>>
		setOpen: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const virtualizerParentRef = useRef<HTMLDivElement>(null)

		const rowVirtualizer = useVirtualizer({
			count: item ? item.receivers.length : 0,
			getScrollElement: () => virtualizerParentRef.current,
			estimateSize: () => 40,
			getItemKey(index) {
				return item ? item.receivers[index].id : 0
			},
			overscan: 5
		})

		return (
			<div
				ref={virtualizerParentRef}
				style={{
					height: 384,
					overflowX: "hidden",
					overflowY: "auto"
				}}
			>
				<div
					style={{
						height: `${rowVirtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative"
					}}
				>
					{rowVirtualizer.getVirtualItems().map(virtualItem => {
						const receiver = item.receivers[virtualItem.index]

						return (
							<div
								key={virtualItem.key}
								data-index={virtualItem.index}
								ref={rowVirtualizer.measureElement}
							>
								<Receiver
									receiver={receiver}
									setItem={setItem}
									item={item}
									setOpen={setOpen}
								/>
							</div>
						)
					})}
				</div>
			</div>
		)
	}
)

export default List
