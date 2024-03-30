import { memo, useEffect, useRef, useMemo, useTransition } from "react"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import useRouteParent from "@/hooks/useRouteParent"
import { useRouterState } from "@tanstack/react-router"
import ListList from "./list"
import { useLocalStorage } from "@uidotdev/usehooks"
import GridList from "./grid"
import { orderItemsByType } from "../utils"

export const List = memo(() => {
	const { items, setItems, searchTerm } = useDriveItemsStore()
	const parent = useRouteParent()
	const routerState = useRouterState()
	const lastPathname = useRef<string>("")
	const [, startTransition] = useTransition()
	const [listType] = useLocalStorage<Record<string, "grid" | "list">>("listType", {})
	const { currentReceiverId } = useDriveSharedStore()

	const query = useQuery({
		queryKey: ["listDirectory", parent, currentReceiverId],
		queryFn: () =>
			routerState.location.pathname.includes("favorites")
				? worker.listFavorites()
				: routerState.location.pathname.includes("shared-in")
					? worker.listDirectorySharedIn({ uuid: parent })
					: routerState.location.pathname.includes("shared-out")
						? worker.listDirectorySharedOut({ uuid: parent, receiverId: currentReceiverId })
						: worker.listDirectory({ uuid: parent })
	})

	const itemsOrdered = useMemo(() => {
		if (routerState.location.pathname.includes("recents")) {
			return items
		}

		return orderItemsByType({ items, type: "nameAsc" })
	}, [items, routerState.location.pathname])

	const itemsFiltered = useMemo(() => {
		if (searchTerm.length === 0) {
			return itemsOrdered
		}

		const searchTermLowered = searchTerm.trim().toLowerCase()

		return itemsOrdered.filter(item => item.name.toLowerCase().includes(searchTermLowered))
	}, [itemsOrdered, searchTerm])

	useEffect(() => {
		if (query.isSuccess) {
			startTransition(() => {
				setItems(query.data)
			})
		}
	}, [query.isSuccess, query.data, setItems])

	useEffect(() => {
		// We have to manually refetch the query because the component does not remount, only the location pathname changes.
		if (lastPathname.current !== routerState.location.pathname && query.isSuccess) {
			lastPathname.current = routerState.location.pathname

			startTransition(() => {
				query.refetch().catch(console.error)
			})
		}
	}, [routerState.location.pathname, query, setItems])

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
