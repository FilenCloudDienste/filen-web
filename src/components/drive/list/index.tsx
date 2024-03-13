import { memo, useEffect, useRef } from "react"
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import { useDriveItemsStore } from "@/stores/drive.store"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import useRouteParent from "@/hooks/useRouteParent"
import { useRouterState } from "@tanstack/react-router"
import { useVirtualizer } from "@tanstack/react-virtual"
import ListItem from "./item/listItem"
import ContextMenu from "./contextMenu"

export const List = memo(() => {
	const windowSize = useWindowSize()
	const { items, setItems } = useDriveItemsStore()
	const parent = useRouteParent()
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const routerState = useRouterState()
	const lastPathname = useRef<string>("")

	const query = useQuery({
		queryKey: ["listDirectory", parent],
		queryFn: () =>
			routerState.location.pathname.includes("favorites")
				? worker.listFavorites()
				: routerState.location.pathname.includes("shared-in")
					? worker.listDirectorySharedIn({ uuid: parent })
					: routerState.location.pathname.includes("shared-out")
						? worker.listDirectorySharedOut({ uuid: parent })
						: worker.listDirectory({ uuid: parent })
	})

	const rowVirtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 44,
		getItemKey(index) {
			return items[index].uuid
		},
		overscan: 5
	})

	useEffect(() => {
		if (query.isSuccess) {
			setItems(query.data)
		}
	}, [query.isSuccess, query.data, setItems])

	useEffect(() => {
		// We have to manually refetch the query because the component does not remount, only the location pathname changes.
		if (lastPathname.current !== routerState.location.pathname && query.isSuccess) {
			lastPathname.current = routerState.location.pathname

			query.refetch().catch(console.error)
		}
	}, [routerState.location.pathname, query])

	return (
		<ContextMenu>
			<div
				ref={virtualizerParentRef}
				style={{
					height: IS_DESKTOP ? windowSize.height - 48 - 40 - 24 : windowSize.height - 48 - 40,
					overflowX: "hidden",
					overflowY: "scroll"
				}}
				className="dragselect-start-allowed"
			>
				<div
					style={{
						height: `${rowVirtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative"
					}}
				>
					{query.isSuccess &&
						rowVirtualizer.getVirtualItems().map(virtualItem => {
							const item = items[virtualItem.index]

							return (
								<ListItem
									key={virtualItem.key}
									item={item}
									virtualItem={virtualItem}
									items={items}
								/>
							)
						})}
				</div>
			</div>
		</ContextMenu>
	)
})

export default List
