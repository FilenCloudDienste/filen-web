import { memo, useMemo, useCallback } from "react"
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import { Virtuoso } from "react-virtuoso"
import ListItem from "./item"
import ContextMenu from "./contextMenu"
import { type DriveCloudItem } from ".."
import { useLocalStorage } from "@uidotdev/usehooks"
import { type DriveSortBy } from "./header"
import useRouteParent from "@/hooks/useRouteParent"

export const List = memo(({ items }: { items: DriveCloudItem[] }) => {
	const windowSize = useWindowSize()
	const routeParent = useRouteParent()
	const [driveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})

	const virtuosoHeight = useMemo(() => {
		return IS_DESKTOP ? windowSize.height - 48 - 40 - 24 : windowSize.height - 48 - 40
	}, [windowSize.height])

	const getItemKey = useCallback(
		(_: number, item: DriveCloudItem) => `${item.uuid}:${driveSortBy[routeParent] ?? "nameAsc"}`,
		[driveSortBy, routeParent]
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

	return (
		<ContextMenu>
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
		</ContextMenu>
	)
})

export default List
