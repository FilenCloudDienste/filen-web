import { useEffect, useRef, Fragment, memo } from "react"
import { useGrid, useVirtualizer } from "@virtual-grid/react"
import { type UseQueryResult } from "@tanstack/react-query"
import { type DriveCloudItem } from ".."
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import ListItem from "./item"
import ContextMenu from "./contextMenu"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"

export const Grid = memo(({ items, query }: { items: DriveCloudItem[]; query: UseQueryResult<DriveCloudItem[], Error> }) => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()
	const { setItems } = useDriveItemsStore()
	const {
		currentReceiverId,
		currentSharerId,
		setCurrentReceiverId,
		setCurrentSharerId,
		setCurrentReceiverEmail,
		setCurrentReceivers,
		setCurrentSharerEmail
	} = useDriveSharedStore()
	const navigate = useNavigate()
	const routerState = useRouterState()

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
		<ContextMenu>
			<div
				ref={virtualizerParentRef}
				style={{
					height: IS_DESKTOP ? windowSize.height - 48 - 24 : windowSize.height - 48,
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
					{query.isSuccess &&
						rowVirtualizer.getVirtualItems().map(virtualRow => (
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
												items={items}
												type="grid"
												setCurrentReceiverEmail={setCurrentReceiverEmail}
												setCurrentReceiverId={setCurrentReceiverId}
												setCurrentReceivers={setCurrentReceivers}
												setCurrentSharerEmail={setCurrentSharerEmail}
												setCurrentSharerId={setCurrentSharerId}
												setItems={setItems}
												currentReceiverId={currentReceiverId}
												currentSharerId={currentSharerId}
												navigate={navigate}
												pathname={routerState.location.pathname}
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
