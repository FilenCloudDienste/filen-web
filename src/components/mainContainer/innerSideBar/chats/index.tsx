import { memo, useRef, useEffect, useMemo, useCallback } from "react"
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
import { IS_DESKTOP } from "@/constants"
import useElementDimensions from "@/hooks/useElementDimensions"
import { type SocketEvent } from "@filen/sdk"
import socket from "@/lib/socket"
import eventEmitter from "@/lib/eventEmitter"
import { sortAndFilterConversations } from "./utils"

export const Chats = memo(() => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()
	const { conversations, setConversations, selectedConversation, setSelectedConversation, setConversationsUnread, search } =
		useChatsStore()
	const [, setLastSelectedChatsConversation] = useLocalStorage("lastSelectedChatsConversation", "")
	const navigate = useNavigate()
	const routeParent = useRouteParent()
	const queryUpdatedAtRef = useRef<number>(-1)
	const { userId } = useSDKConfig()
	const topDimensions = useElementDimensions("inner-sidebar-top-chats")

	const query = useQuery({
		queryKey: ["listChatsConversations"],
		queryFn: () => worker.listChatsConversations()
	})

	const conversationsSorted = useMemo(() => {
		return sortAndFilterConversations(conversations, search, userId)
	}, [conversations, userId, search])

	const rowVirtualizer = useVirtualizer({
		count: conversationsSorted.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 72,
		getItemKey(index) {
			return conversationsSorted[index].uuid
		},
		overscan: 5
	})

	const fetchConversationUnreadCount = useCallback(
		async (uuid: string) => {
			try {
				const count = await worker.chatConversationUnreadCount({ conversation: uuid })

				setConversationsUnread(prev => ({ ...prev, [uuid]: count }))
			} catch (e) {
				console.error(e)
			}
		},
		[setConversationsUnread]
	)

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (event.type === "chatMessageNew") {
					const filteredConversations = conversations.filter(c => c.uuid === event.data.conversation)

					if (filteredConversations.length === 0) {
						return
					}

					const conversation = filteredConversations[0]
					const key = await worker.chatKey({ conversation: conversation.uuid })
					const message = await worker.decryptChatMessage({ message: event.data.message, key })

					if (message.length === 0) {
						return
					}

					setConversations(prev =>
						prev.map(c =>
							c.uuid === conversation.uuid
								? {
										...c,
										lastMessage: message,
										lastMessageSender: event.data.senderId,
										lastMessageTimestamp: event.data.sentTimestamp,
										lastMessageUUID: event.data.uuid
									}
								: c
						)
					)

					setSelectedConversation(prev =>
						prev
							? prev.uuid === conversation.uuid
								? {
										...prev,
										lastMessage: message,
										lastMessageSender: event.data.senderId,
										lastMessageTimestamp: event.data.sentTimestamp,
										lastMessageUUID: event.data.uuid
									}
								: prev
							: prev
					)

					if (event.data.senderId !== userId) {
						setConversationsUnread(prev => ({
							...prev,
							[event.data.conversation]: prev[event.data.conversation] ? prev[event.data.conversation] + 1 : 1
						}))
					}
				} else if (
					event.type === "chatMessageDelete" ||
					event.type === "chatMessageEdited" ||
					event.type === "chatConversationNameEdited" ||
					event.type === "chatConversationParticipantLeft"
				) {
					await query.refetch()
				} else if (event.type === "chatConversationDeleted") {
					if (routeParent === event.data.uuid) {
						navigate({
							to: "/chats"
						})
					}

					await query.refetch()
				}
			} catch (e) {
				console.error(e)
			}
		},
		[conversations, setConversations, query, setSelectedConversation, routeParent, navigate, setConversationsUnread, userId]
	)

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

			for (const convo of query.data) {
				fetchConversationUnreadCount(convo.uuid)
			}
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, setConversations, fetchConversationUnreadCount])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	useEffect(() => {
		const refetchChatsListener = eventEmitter.on("refetchChats", () => {
			query.refetch().catch(console.error)
		})

		return () => {
			refetchChatsListener.remove()
		}
	}, [query])

	return (
		<div
			ref={virtualizerParentRef}
			style={{
				height: windowSize.height - topDimensions.height - 48 - (IS_DESKTOP ? 24 : 0),
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
								userId={userId}
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
