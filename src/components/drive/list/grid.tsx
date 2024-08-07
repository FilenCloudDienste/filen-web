import { useRef, forwardRef, memo, useMemo, useCallback, Fragment } from "react"
import { type DriveCloudItem } from ".."
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import ListItem from "./item"
import ContextMenu from "./contextMenu"
import { Skeleton } from "@/components/ui/skeleton"
import Empty from "./empty"
import { VirtuosoGrid, type VirtuosoGridHandle, type GridComponents } from "react-virtuoso"
import useCanUpload from "@/hooks/useCanUpload"

export const Grid = memo(({ items, showSkeletons }: { items: DriveCloudItem[]; showSkeletons: boolean }) => {
	const windowSize = useWindowSize()
	const virtuosoRef = useRef<VirtuosoGridHandle>(null)
	const canUpload = useCanUpload()

	const height = useMemo(() => {
		return windowSize.height - 48 - DESKTOP_TOPBAR_HEIGHT
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

	const getItemKey = useCallback((_: number, item: DriveCloudItem) => item.uuid, [])

	const itemContent = useCallback((index: number, item: DriveCloudItem) => {
		return (
			<ListItem
				item={item}
				index={index}
				type="grid"
			/>
		)
	}, [])

	const components = useMemo(() => {
		return {
			Item: props => {
				return (
					<div
						{...props}
						style={{
							width: "200px"
						}}
					/>
				)
			},
			List: forwardRef(({ style, children }, listRef) => (
				<div
					ref={listRef}
					style={{
						display: "flex",
						flexWrap: "wrap",
						...style
					}}
				>
					{children}
				</div>
			))
		} as GridComponents
	}, [])

	const ContextMenuComponent = useMemo(() => {
		if (canUpload) {
			return ContextMenu
		}

		return Fragment
	}, [canUpload])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: height + "px",
			width: "100%"
		}
	}, [height])

	if (showSkeletons) {
		return <div className="flex flex-row flex-wrap overflow-hidden">{skeletons}</div>
	}

	if (items.length === 0) {
		return (
			<ContextMenu>
				<div
					style={{
						height: height - 40,
						width: "100%"
					}}
				>
					<Empty />
				</div>
			</ContextMenu>
		)
	}

	return (
		<ContextMenuComponent>
			<VirtuosoGrid
				ref={virtuosoRef}
				totalCount={items.length}
				width="100%"
				height={height}
				id="virtuoso-drive-list"
				data={items}
				style={style}
				components={components}
				computeItemKey={getItemKey}
				itemContent={itemContent}
			/>
		</ContextMenuComponent>
	)
})

export default Grid
