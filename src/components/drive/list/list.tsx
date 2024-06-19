import { memo, useMemo, useCallback, Fragment } from "react"
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import { Virtuoso } from "react-virtuoso"
import ListItem from "./item"
import ContextMenu from "./contextMenu"
import { type DriveCloudItem } from ".."
import { useLocalStorage } from "@uidotdev/usehooks"
import Header, { type DriveSortBy } from "./header"
import useRouteParent from "@/hooks/useRouteParent"
import { Skeleton } from "@/components/ui/skeleton"
import Empty from "./empty"
import useCanUpload from "@/hooks/useCanUpload"

export const List = memo(({ items, showSkeletons }: { items: DriveCloudItem[]; showSkeletons: boolean }) => {
	const windowSize = useWindowSize()
	const routeParent = useRouteParent()
	const [driveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})
	const canUpload = useCanUpload()

	const virtuosoHeight = useMemo(() => {
		return IS_DESKTOP ? windowSize.height - 48 - (showSkeletons ? 0 : 32) - 24 : windowSize.height - 48 - (showSkeletons ? 0 : 32)
	}, [windowSize.height, showSkeletons])

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

	const ContextMenuComponent = useMemo(() => {
		if (canUpload) {
			return ContextMenu
		}

		return Fragment
	}, [canUpload])

	return (
		<>
			{items.length > 0 && <Header />}
			<ContextMenuComponent>
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
					style={{
						overflowX: "hidden",
						overflowY: "auto",
						height: virtuosoHeight + "px",
						width: "100%"
					}}
				/>
			</ContextMenuComponent>
		</>
	)
})

export default List
