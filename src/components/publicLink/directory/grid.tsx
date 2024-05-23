import { useGrid, useVirtualizer } from "@virtual-grid/react"
import { memo, useEffect, useRef, Fragment } from "react"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import { type DriveCloudItem } from "@/components/drive"
import ListItem from "@/components/drive/list/item"

export const Grid = memo(({ items }: { items: DriveCloudItem[] }) => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()

	const grid = useGrid({
		scrollRef: virtualizerParentRef,
		count: items.length,
		columns: "auto",
		size: 200,
		overscan: 5
	})

	const rowVirtualizer = useVirtualizer(grid.rowVirtualizer)
	const columnVirtualizer = useVirtualizer(grid.columnVirtualizer)

	useEffect(() => {
		columnVirtualizer.measure()
	}, [columnVirtualizer, grid.virtualItemWidth])

	return (
		<div
			ref={virtualizerParentRef}
			style={{
				height: IS_DESKTOP ? windowSize.height - 48 - 24 : windowSize.height - 48,
				width: "100%",
				overflowX: "hidden",
				overflowY: "auto"
			}}
			className="dragselect-start-allowed"
		>
			<div
				style={{
					position: "relative",
					width: `${columnVirtualizer.getTotalSize()}px`,
					height: `${rowVirtualizer.getTotalSize()}px`
				}}
				className="dragselect-start-allowed"
			>
				{rowVirtualizer.getVirtualItems().map(virtualRow => (
					<Fragment key={virtualRow.key}>
						{columnVirtualizer.getVirtualItems().map(virtualColumn => {
							const gridItem = grid.getVirtualItem({
								row: virtualRow,
								column: virtualColumn
							})

							if (!gridItem) {
								return null
							}

							const item = items[gridItem.index]

							return (
								<div
									key={item.uuid}
									style={gridItem.style}
								>
									<ListItem
										item={item}
										index={gridItem.index}
										type="grid"
									/>
								</div>
							)
						})}
					</Fragment>
				))}
			</div>
		</div>
	)
})

export default Grid
