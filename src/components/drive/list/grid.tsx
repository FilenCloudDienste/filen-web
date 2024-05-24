import { useEffect, useRef, Fragment, memo, useMemo } from "react"
import { useGrid, useVirtualizer } from "@virtual-grid/react"
import { type DriveCloudItem } from ".."
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import ListItem from "./item"
import ContextMenu from "./contextMenu"
import { Skeleton } from "@/components/ui/skeleton"
import Empty from "./empty"

export const Grid = memo(({ items, showSkeletons }: { items: DriveCloudItem[]; showSkeletons: boolean }) => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()

	const height = useMemo(() => {
		return IS_DESKTOP ? windowSize.height - 48 - 24 : windowSize.height - 48
	}, [windowSize.height])

	const grid = useGrid({
		scrollRef: virtualizerParentRef,
		count: items.length,
		columns: "auto",
		size: 200,
		overscan: 5
	})

	const skeletons = useMemo(() => {
		return new Array(100).fill(1).map((_, index) => {
			return (
				<div
					key={index}
					className="w-[200px] h-[200px] p-3"
				>
					<Skeleton className="w-full h-full rounded-md" />
				</div>
			)
		})
	}, [])

	const rowVirtualizer = useVirtualizer(grid.rowVirtualizer)
	const columnVirtualizer = useVirtualizer(grid.columnVirtualizer)

	useEffect(() => {
		columnVirtualizer.measure()
	}, [columnVirtualizer, grid.virtualItemWidth])

	if (showSkeletons) {
		return <div className="flex flex-row flex-wrap overflow-hidden">{skeletons}</div>
	}

	if (items.length === 0) {
		return (
			<ContextMenu>
				<Empty />
			</ContextMenu>
		)
	}

	return (
		<ContextMenu>
			<div
				ref={virtualizerParentRef}
				style={{
					height,
					overflowX: "hidden",
					overflowY: "auto",
					width: "100%"
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

								if (!item) {
									return null
								}

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
		</ContextMenu>
	)
})

export default Grid
