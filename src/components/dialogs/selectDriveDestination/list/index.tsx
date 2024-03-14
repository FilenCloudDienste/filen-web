import { memo, useState, useEffect, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import { type DriveCloudItem } from "@/components/drive"
import worker from "@/lib/worker"
import ListItem from "./listItem"
import { useTranslation } from "react-i18next"

export const List = memo(({ pathname, setPathname }: { pathname: string; setPathname: React.Dispatch<React.SetStateAction<string>> }) => {
	const [items, setItems] = useState<DriveCloudItem[]>([])
	const lastPathname = useRef<string>("")
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const { t } = useTranslation()

	const parent = useMemo(() => {
		const ex = pathname.split("/")

		return ex[ex.length - 1]
	}, [pathname])

	const query = useQuery({
		queryKey: ["listDirectoryOnlyDirectories", parent],
		queryFn: () =>
			new Promise<DriveCloudItem[]>((resolve, reject) => {
				worker
					.listDirectory({ uuid: parent, onlyDirectories: true })
					.then(res => resolve(res.filter(item => item.type === "directory")))
					.catch(reject)
			})
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
		if (lastPathname.current !== pathname && query.isSuccess) {
			lastPathname.current = pathname

			query.refetch().catch(console.error)
		}
	}, [pathname, query])

	return (
		<div
			ref={virtualizerParentRef}
			style={{
				height: 384,
				overflowX: "hidden",
				overflowY: "auto"
			}}
		>
			{query.isSuccess && query.data.length === 0 ? (
				<div className="w-full h-full flex flex-col items-center justify-center">
					<p className="select-none">{t("dialogs.selectDriveDestination.listEmpty")}</p>
				</div>
			) : (
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
									setPathname={setPathname}
								/>
							)
						})}
				</div>
			)}
		</div>
	)
})

export default List
