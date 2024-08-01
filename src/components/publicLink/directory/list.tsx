import { memo, useMemo, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import { type DriveCloudItem } from "@/components/drive"
import useWindowSize from "@/hooks/useWindowSize"
import { useLocalStorage } from "@uidotdev/usehooks"
import { type DriveSortBy } from "@/components/drive/list/header"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import ListItem from "@/components/drive/list/item"
import { Skeleton } from "@/components/ui/skeleton"
import Empty from "@/components/drive/list/empty"

export const List = memo(({ items, parent, showSkeletons }: { items: DriveCloudItem[]; parent: string; showSkeletons: boolean }) => {
	const windowSize = useWindowSize()
	const [driveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})

	const getItemKey = useCallback(
		(_: number, item: DriveCloudItem) => `${item.uuid}:${driveSortBy[parent] ?? "nameAsc"}`,
		[driveSortBy, parent]
	)

	const itemContent = useCallback((index: number, item: DriveCloudItem) => {
		return (
			<ListItem
				item={item}
				index={index}
				type="list"
			/>
		)
	}, [])

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 48 - 40 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="flex flex-col w-full h-full overflow-hidden py-3">
						{showSkeletons ? (
							new Array(100).fill(1).map((_, index) => {
								return (
									<div
										key={index}
										className="flex flex-row h-11 gap-3 items-center px-3 mb-3"
									>
										<Skeleton className="w-7 h-7 rounded-md shrink-0" />
										<Skeleton className="grow rounded-md h-6" />
										<Skeleton className="rounded-md h-6 w-[125px]" />
										<Skeleton className="rounded-md h-6 w-[250px]" />
									</div>
								)
							})
						) : (
							<Empty />
						)}
					</div>
				)
			}
		}
	}, [showSkeletons])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	return (
		<Virtuoso
			data={items}
			totalCount={items.length}
			height={virtuosoHeight}
			width="100%"
			computeItemKey={getItemKey}
			defaultItemHeight={44}
			fixedItemHeight={44}
			itemContent={itemContent}
			components={components}
			id="virtuoso-drive-list"
			style={style}
		/>
	)
})

export default List
