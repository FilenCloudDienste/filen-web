import { memo, useEffect, useRef, useMemo, useTransition, useCallback } from "react"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import useRouteParent from "@/hooks/useRouteParent"
import useLocation from "@/hooks/useLocation"
import ListList from "./list"
import { useLocalStorage } from "@uidotdev/usehooks"
import GridList from "./grid"
import { orderItemsByType } from "../utils"
import { type SocketEvent, type FileEncryptionVersion } from "@filen/sdk"
import socket from "@/lib/socket"
import { convertTimestampToMs } from "@/utils"

export const List = memo(() => {
	const { items, setItems, searchTerm } = useDriveItemsStore()
	const parent = useRouteParent()
	const location = useLocation()
	const lastPathname = useRef<string>("")
	const [, startTransition] = useTransition()
	const [listType] = useLocalStorage<Record<string, "grid" | "list">>("listType", {})
	const { currentReceiverId, currentReceiverEmail, currentSharerEmail, currentSharerId, currentReceivers } = useDriveSharedStore()
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
			return orderItemsByType({ items, type: "uploadDateDesc" })
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

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (
					event.type === "fileArchived" ||
					event.type === "fileTrash" ||
					event.type === "folderTrash" ||
					event.type === "fileMove" ||
					event.type === "folderMove"
				) {
					startTransition(() => {
						setItems(prev => prev.filter(i => i.uuid !== event.data.uuid))
					})
				} else if (event.type === "trashEmpty") {
					if (!location.includes("trash")) {
						return
					}

					startTransition(() => {
						setItems([])
					})

					await query.refetch()
				} else if (event.type === "fileNew") {
					if (event.data.parent !== parent) {
						return
					}

					const metadata = await worker.decryptFileMetadata({ metadata: event.data.metadata })

					startTransition(() => {
						setItems(prev => [
							...prev.filter(i => i.name.toLowerCase() !== metadata.name.toLowerCase() && i.uuid !== event.data.uuid),
							{
								type: "file",
								uuid: event.data.uuid,
								timestamp: convertTimestampToMs(event.data.timestamp),
								lastModified: metadata.lastModified,
								creation: metadata.creation,
								hash: metadata.hash,
								name: metadata.name,
								key: metadata.key,
								mime: metadata.mime,
								size: metadata.size,
								parent: event.data.parent,
								chunks: event.data.chunks,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers,
								favorited: event.data.favorited === 1,
								rm: event.data.rm,
								region: event.data.region,
								bucket: event.data.bucket,
								version: event.data.version as FileEncryptionVersion,
								selected: false
							}
						])
					})
				} else if (event.type === "folderSubCreated") {
					if (event.data.parent !== parent) {
						return
					}

					const metadata = await worker.decryptFolderMetadata({ metadata: event.data.name })

					startTransition(() => {
						setItems(prev => [
							...prev.filter(i => i.name.toLowerCase() !== metadata.name.toLowerCase() && i.uuid !== event.data.uuid),
							{
								type: "directory",
								uuid: event.data.uuid,
								timestamp: convertTimestampToMs(event.data.timestamp),
								lastModified: convertTimestampToMs(event.data.timestamp),
								name: metadata.name,
								size: 0,
								color: null,
								parent: event.data.parent,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers,
								favorited: event.data.favorited === 1,
								selected: false
							}
						])
					})
				} else if (event.type === "fileRename") {
					const metadata = await worker.decryptFileMetadata({ metadata: event.data.metadata })

					startTransition(() => {
						setItems(prev => prev.map(item => (item.uuid === event.data.uuid ? { ...item, name: metadata.name } : item)))
					})
				} else if (event.type === "folderRename") {
					const metadata = await worker.decryptFolderMetadata({ metadata: event.data.name })

					startTransition(() => {
						setItems(prev => prev.map(item => (item.uuid === event.data.uuid ? { ...item, name: metadata.name } : item)))
					})
				} else if (event.type === "fileRestore") {
					if (location.includes("trash")) {
						startTransition(() => {
							setItems(prev => prev.filter(i => i.uuid !== event.data.uuid))
						})
					}

					if (event.data.parent !== parent) {
						return
					}

					const metadata = await worker.decryptFileMetadata({ metadata: event.data.metadata })

					startTransition(() => {
						setItems(prev => [
							...prev.filter(i => i.name.toLowerCase() !== metadata.name.toLowerCase() && i.uuid !== event.data.uuid),
							{
								type: "file",
								uuid: event.data.uuid,
								timestamp: convertTimestampToMs(event.data.timestamp),
								lastModified: metadata.lastModified,
								creation: metadata.creation,
								hash: metadata.hash,
								name: metadata.name,
								key: metadata.key,
								mime: metadata.mime,
								size: metadata.size,
								parent: event.data.parent,
								chunks: event.data.chunks,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers,
								favorited: event.data.favorited === 1,
								rm: event.data.rm,
								region: event.data.region,
								bucket: event.data.bucket,
								version: event.data.version as FileEncryptionVersion,
								selected: false
							}
						])
					})
				} else if (event.type === "folderRestore") {
					if (location.includes("trash")) {
						startTransition(() => {
							setItems(prev => prev.filter(i => i.uuid !== event.data.uuid))
						})
					}

					if (event.data.parent !== parent) {
						return
					}

					const metadata = await worker.decryptFolderMetadata({ metadata: event.data.name })

					startTransition(() => {
						setItems(prev => [
							...prev.filter(i => i.name.toLowerCase() !== metadata.name.toLowerCase() && i.uuid !== event.data.uuid),
							{
								type: "directory",
								uuid: event.data.uuid,
								timestamp: convertTimestampToMs(event.data.timestamp),
								lastModified: convertTimestampToMs(event.data.timestamp),
								name: metadata.name,
								size: 0,
								color: null,
								parent: event.data.parent,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers,
								favorited: event.data.favorited === 1,
								selected: false
							}
						])
					})
				} else if (event.type === "fileArchiveRestored") {
					if (event.data.parent !== parent) {
						return
					}

					const metadata = await worker.decryptFileMetadata({ metadata: event.data.metadata })

					startTransition(() => {
						setItems(prev => [
							...prev.filter(
								i =>
									i.uuid !== event.data.currentUUID &&
									i.name.toLowerCase() !== metadata.name.toLowerCase() &&
									i.uuid !== event.data.uuid
							),
							{
								type: "file",
								uuid: event.data.uuid,
								timestamp: convertTimestampToMs(event.data.timestamp),
								lastModified: metadata.lastModified,
								creation: metadata.creation,
								hash: metadata.hash,
								name: metadata.name,
								key: metadata.key,
								mime: metadata.mime,
								size: metadata.size,
								parent: event.data.parent,
								chunks: event.data.chunks,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers,
								favorited: event.data.favorited === 1,
								rm: event.data.rm,
								region: event.data.region,
								bucket: event.data.bucket,
								version: event.data.version as FileEncryptionVersion,
								selected: false
							}
						])
					})
				} else if (event.type === "folderColorChanged") {
					startTransition(() => {
						setItems(prev => prev.map(item => (item.uuid === event.data.uuid ? { ...item, color: event.data.color } : item)))
					})
				}
			} catch (e) {
				console.error(e)
			}
		},
		[setItems, location, query, parent, currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId]
	)

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

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

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
