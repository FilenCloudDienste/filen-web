import { useGrid, useVirtualizer } from "@virtual-grid/react"
import { memo, useEffect, useRef, Fragment, useMemo } from "react"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import { type DriveCloudItem } from "@/components/drive"
import ListItem from "@/components/drive/list/item"
import Empty from "@/components/drive/list/empty"
import { Skeleton } from "@/components/ui/skeleton"

export const Grid = memo(({ items, showSkeletons }: { items: DriveCloudItem[]; showSkeletons: boolean }) => {
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

	const height = useMemo(() => {
		return IS_DESKTOP ? windowSize.height - 48 - 24 : windowSize.height - 48
	}, [windowSize.height])

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

	useEffect(() => {
		columnVirtualizer.measure()
	}, [columnVirtualizer, grid.virtualItemWidth])

	if (showSkeletons) {
		return <div className="flex flex-row flex-wrap overflow-hidden">{skeletons}</div>
	}

	if (items.length === 0) {
		return (
			<div
				style={{
					height: height - 40,
					width: "100%"
				}}
			>
				<Empty />
			</div>
		)
	}

	return (
		<div
			ref={virtualizerParentRef}
			style={{
				height: height,
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
	)
})

export default Grid
