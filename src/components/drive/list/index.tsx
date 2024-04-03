import { memo, useEffect, useRef, useMemo, useTransition } from "react"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import useRouteParent from "@/hooks/useRouteParent"
import useLocation from "@/hooks/useLocation"
import ListList from "./list"
import { useLocalStorage } from "@uidotdev/usehooks"
import GridList from "./grid"
import { orderItemsByType } from "../utils"

export const List = memo(() => {
	const { items, setItems, searchTerm } = useDriveItemsStore()
	const parent = useRouteParent()
	const location = useLocation()
	const lastPathname = useRef<string>("")
	const [, startTransition] = useTransition()
	const [listType] = useLocalStorage<Record<string, "grid" | "list">>("listType", {})
	const { currentReceiverId } = useDriveSharedStore()
	const queryUpdatedAtRef = useRef<number>(-1)

	const query = useQuery({
		queryKey: ["listDirectory", parent, currentReceiverId],
		queryFn: () =>
			location.includes("favorites")
				? worker.listFavorites()
				: location.includes("shared-in")
					? worker.listDirectorySharedIn({ uuid: parent })
					: location.includes("shared-out")
						? worker.listDirectorySharedOut({ uuid: parent, receiverId: currentReceiverId })
						: worker.listDirectory({ uuid: parent })
	})

	const itemsOrdered = useMemo(() => {
		if (location.includes("recents")) {
			return items
		}

		return orderItemsByType({ items, type: "nameAsc" })
	}, [items, location])

	const itemsFiltered = useMemo(() => {
		if (searchTerm.length === 0) {
			return itemsOrdered
		}

		const searchTermLowered = searchTerm.trim().toLowerCase()

		return itemsOrdered.filter(item => item.name.toLowerCase().includes(searchTermLowered))
	}, [itemsOrdered, searchTerm])

	useEffect(() => {
		if (query.isSuccess && queryUpdatedAtRef.current !== query.dataUpdatedAt) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			startTransition(() => {
				setItems(query.data)
			})
		}
	}, [query.isSuccess, query.data, setItems, query.dataUpdatedAt])

	useEffect(() => {
		// We have to manually refetch the query because the component does not remount, only the location pathname changes.
		if (lastPathname.current !== location && query.isSuccess) {
			lastPathname.current = location

			startTransition(() => {
				query.refetch().catch(console.error)
			})
		}
	}, [location, query, setItems])

	return listType[parent] === "grid" ? (
		<GridList
			items={itemsFiltered}
			query={query}
		/>
	) : (
		<ListList
			items={itemsFiltered}
			query={query}
		/>
	)
})

export default List
