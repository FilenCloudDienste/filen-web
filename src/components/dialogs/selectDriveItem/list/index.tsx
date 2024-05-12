import { memo, useEffect, useRef, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Virtuoso } from "react-virtuoso"
import worker from "@/lib/worker"
import ListItem from "./listItem"
import eventEmitter from "@/lib/eventEmitter"
import { orderItemsByType } from "@/components/drive/utils"
import { type SelectionType } from ".."
import { type DriveCloudItem } from "@/components/drive"

export const List = memo(
	({
		pathname,
		setPathname,
		selectionType,
		selectMultiple,
		responseItems,
		setResponseItems
	}: {
		pathname: string
		setPathname: React.Dispatch<React.SetStateAction<string>>
		selectionType: SelectionType
		selectMultiple: boolean
		responseItems: DriveCloudItem[]
		setResponseItems: React.Dispatch<React.SetStateAction<DriveCloudItem[]>>
	}) => {
		const lastPathname = useRef<string>("")

		const parent = useMemo(() => {
			const ex = pathname.split("/")

			return ex[ex.length - 1]
		}, [pathname])

		const query = useQuery({
			queryKey: ["listDirectory", parent],
			queryFn: () => worker.listDirectory({ uuid: parent })
		})

		const itemsOrdered = useMemo(() => {
			if (!query.isSuccess) {
				return []
			}

			return orderItemsByType({ items: query.data, type: "nameAsc" })
		}, [query.isSuccess, query.data])

		const getItemKey = useCallback((_: number, item: DriveCloudItem) => item.uuid, [])

		const itemContent = useCallback(
			(_: number, item: DriveCloudItem) => {
				return (
					<ListItem
						item={item}
						setPathname={setPathname}
						setResponseItems={setResponseItems}
						responseItems={responseItems}
						selectMultiple={selectMultiple}
						selectionType={selectionType}
					/>
				)
			},
			[setPathname, setResponseItems, responseItems, selectMultiple, selectionType]
		)

		useEffect(() => {
			// We have to manually refetch the query because the component does not remount, only the location pathname changes.
			if (lastPathname.current !== pathname && query.isSuccess) {
				lastPathname.current = pathname

				query.refetch().catch(console.error)
			}
		}, [pathname, query])

		useEffect(() => {
			const listener = eventEmitter.on("refetchSelectItemDialogList", ({ uuid }: { uuid: string }) => {
				if (uuid !== parent) {
					return
				}

				query.refetch().catch(console.error)
			})

			return () => {
				listener.remove()
			}
		}, [parent, query])

		return (
			<Virtuoso
				data={itemsOrdered}
				totalCount={itemsOrdered.length}
				height={384}
				width="100%"
				computeItemKey={getItemKey}
				defaultItemHeight={44}
				itemContent={itemContent}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: 384 + "px",
					width: "100%"
				}}
			/>
		)
	}
)

export default List
