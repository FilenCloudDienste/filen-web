import { memo, useRef, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { useVirtualizer } from "@tanstack/react-virtual"
import useWindowSize from "@/hooks/useWindowSize"
import { useChatsStore } from "@/stores/chats.store"
import { useLocalStorage } from "@uidotdev/usehooks"
import { validate as validateUUID } from "uuid"
import { useNavigate } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import Chat from "./chat"
import useSDKConfig from "@/hooks/useSDKConfig"

export const Chats = memo(() => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()
	const { conversations, setConversations, selectedConversation, setSelectedConversation } = useChatsStore()
	const [, setLastSelectedChatsConversation] = useLocalStorage("lastSelectedChatsConversation", "")
	const navigate = useNavigate()
	const routeParent = useRouteParent()
	const queryUpdatedAtRef = useRef<number>(-1)
	const sdkConfig = useSDKConfig()

	const query = useQuery({
		queryKey: ["listChatsConversations"],
		queryFn: () => worker.listChatsConversations()
	})

	const conversationsSorted = useMemo(() => {
		return conversations
	}, [conversations])

	const rowVirtualizer = useVirtualizer({
		count: conversationsSorted.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 72,
		getItemKey(index) {
			return conversationsSorted[index].uuid
		},
		overscan: 5
	})

	useEffect(() => {
		if (conversationsSorted.length > 0) {
			if (!validateUUID(routeParent)) {
				setLastSelectedChatsConversation(conversationsSorted[0].uuid)
				setSelectedConversation(conversationsSorted[0])

				navigate({
					to: "/chats/$uuid",
					params: {
						uuid: conversationsSorted[0].uuid
					}
				})
			} else {
				if (!selectedConversation) {
					const foundNote = conversationsSorted.filter(note => note.uuid === routeParent)

					if (foundNote.length === 1) {
						setLastSelectedChatsConversation(foundNote[0].uuid)
						setSelectedConversation(foundNote[0])
					}
				}
			}
		}
	}, [navigate, routeParent, conversationsSorted, setLastSelectedChatsConversation, setSelectedConversation, selectedConversation])

	useEffect(() => {
		if (query.isSuccess && query.dataUpdatedAt !== queryUpdatedAtRef.current) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			setConversations(query.data)
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, setConversations])

	return (
		<div
			ref={virtualizerParentRef}
			style={{
				height: windowSize.height - 48 * 2,
				overflowX: "hidden",
				overflowY: "auto"
			}}
		>
			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative"
				}}
			>
				{rowVirtualizer.getVirtualItems().map(virtualItem => {
					const conversation = conversationsSorted[virtualItem.index]

					return (
						<div
							key={virtualItem.key}
							data-index={virtualItem.index}
							ref={rowVirtualizer.measureElement}
						>
							<Chat
								conversation={conversation}
								userId={sdkConfig.userId}
								setLastSelectedChatsConversation={setLastSelectedChatsConversation}
								setSelectedConversation={setSelectedConversation}
								routeParent={routeParent}
							/>
						</div>
					)
				})}
			</div>
		</div>
	)
})

export default Chats
