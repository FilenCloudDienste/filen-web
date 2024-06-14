import { memo, useRef, useMemo, forwardRef, useCallback } from "react"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import { type DriveCloudItem } from "@/components/drive"
import ListItem from "@/components/drive/list/item"
import Empty from "@/components/drive/list/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { VirtuosoGrid, type VirtuosoGridHandle, type GridComponents } from "react-virtuoso"

export const Grid = memo(({ items, showSkeletons }: { items: DriveCloudItem[]; showSkeletons: boolean }) => {
	const virtuosoRef = useRef<VirtuosoGridHandle>(null)
	const windowSize = useWindowSize()

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
			className="flex flex-row w-full"
			style={{
				height: height + "px"
			}}
		>
			<VirtuosoGrid
				ref={virtuosoRef}
				totalCount={items.length}
				data={items}
				width="100%"
				height={height}
				id="virtuoso-drive-list"
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: height + "px",
					width: "100%"
				}}
				components={components}
				computeItemKey={getItemKey}
				itemContent={itemContent}
			/>
		</div>
	)
})

export default Grid
