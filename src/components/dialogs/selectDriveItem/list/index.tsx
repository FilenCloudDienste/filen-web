import { memo, useEffect, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import worker from "@/lib/worker"
import ListItem from "./listItem"
import { useTranslation } from "react-i18next"
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
		const virtualizerParentRef = useRef<HTMLDivElement>(null)
		const { t } = useTranslation()

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

		const rowVirtualizer = useVirtualizer({
			count: itemsOrdered.length,
			getScrollElement: () => virtualizerParentRef.current,
			estimateSize: () => 44,
			getItemKey(index) {
				return itemsOrdered[index].uuid
			},
			overscan: 5
		})

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
			<div
				ref={virtualizerParentRef}
				style={{
					height: 384,
					overflowX: "hidden",
					overflowY: "auto"
				}}
			>
				{query.isSuccess && itemsOrdered.length === 0 ? (
					<div className="w-full h-full flex flex-col items-center justify-center">
						<p className="select-none">{t("dialogs.selectDriveItem.listEmpty")}</p>
					</div>
				) : (
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative"
						}}
					>
						{rowVirtualizer.getVirtualItems().map(virtualItem => {
							const item = itemsOrdered[virtualItem.index]

							return (
								<ListItem
									key={virtualItem.key}
									item={item}
									virtualItem={virtualItem}
									setPathname={setPathname}
									setResponseItems={setResponseItems}
									responseItems={responseItems}
									selectMultiple={selectMultiple}
									selectionType={selectionType}
								/>
							)
						})}
					</div>
				)}
			</div>
		)
	}
)

export default List
