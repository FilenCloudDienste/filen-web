import { memo, useMemo, useCallback } from "react"
import { Virtuoso } from "react-virtuoso"
import { type DriveCloudItem } from "@/components/drive"
import useWindowSize from "@/hooks/useWindowSize"
import { useLocalStorage } from "@uidotdev/usehooks"
import { type DriveSortBy } from "@/components/drive/list/header"
import { IS_DESKTOP } from "@/constants"
import ListItem from "@/components/drive/list/item"

export const List = memo(({ items, parent }: { items: DriveCloudItem[]; parent: string }) => {
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
		return IS_DESKTOP ? windowSize.height - 48 - 40 - 24 : windowSize.height - 48 - 40
	}, [windowSize.height])

	return (
		<>
			<Virtuoso
				data={items}
				totalCount={items.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				defaultItemHeight={44}
				fixedItemHeight={44}
				itemContent={itemContent}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: virtuosoHeight + "px",
					width: "100%"
				}}
			/>
		</>
	)
})

export default List
