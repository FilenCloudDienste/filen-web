import { memo, useRef, useEffect, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import { useChatsStore } from "@/stores/chats.store"
import { useLocalStorage } from "@uidotdev/usehooks"
import { validate as validateUUID } from "uuid"
import { useNavigate } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import Chat from "./chat"
import useSDKConfig from "@/hooks/useSDKConfig"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import useElementDimensions from "@/hooks/useElementDimensions"
import { type SocketEvent } from "@filen/sdk"
import { getSocket } from "@/lib/socket"
import eventEmitter from "@/lib/eventEmitter"
import { sortAndFilterConversations } from "./utils"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchIcon } from "lucide-react"

const processedMessageUUIDs: Record<string, boolean> = {}

export const Chats = memo(() => {
	const windowSize = useWindowSize()
	const { conversations, setConversations, selectedConversation, setSelectedConversation, setConversationsUnread, search } =
		useChatsStore(
			useCallback(
				state => ({
					conversations: state.conversations,
					setConversations: state.setConversations,
					selectedConversation: state.selectedConversation,
					setSelectedConversation: state.setSelectedConversation,
					setConversationsUnread: state.setConversationsUnread,
					search: state.search
				}),
				[]
			)
		)
	const [, setLastSelectedChatsConversation] = useLocalStorage<string>("lastSelectedChatsConversation", "")
	const navigate = useNavigate()
	const routeParent = useRouteParent()
	const queryUpdatedAtRef = useRef<number>(-1)
	const { userId } = useSDKConfig()
	const topDimensions = useElementDimensions("inner-sidebar-top-chats")
	const { t } = useTranslation()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const lastAutoScrollConversationUUIDRef = useRef<string>("")

	const query = useQuery({
		queryKey: ["listChatsConversations"],
		queryFn: () => worker.listChatsConversations()
	})

	const showSkeletons = useMemo(() => {
		if (query.isSuccess && query.data.length >= 0) {
			return false
		}

		return true
	}, [query.data, query.isSuccess])

	const conversationsSorted = useMemo(() => {
		return sortAndFilterConversations(conversations, search, userId)
	}, [conversations, userId, search])

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - topDimensions.height - 48 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height, topDimensions.height])

	const getItemKey = useCallback((_: number, conversation: ChatConversation) => conversation.uuid, [])

	const itemContent = useCallback(
		(_: number, conversation: ChatConversation) => {
			return (
				<Chat
					conversation={conversation}
					userId={userId}
					setLastSelectedChatsConversation={setLastSelectedChatsConversation}
					setSelectedConversation={setSelectedConversation}
					routeParent={routeParent}
				/>
			)
		},
		[userId, setLastSelectedChatsConversation, setSelectedConversation, routeParent]
	)

	const create = useCallback(() => {
		eventEmitter.emit("createChat")
	}, [])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="flex flex-col w-full h-full overflow-hidden py-3">
						{showSkeletons ? (
							new Array(100).fill(1).map((_, index) => {
								return (
									<div
										key={index}
										className="flex flex-row gap-4 px-4 mb-4"
									>
										<div className="flex flex-row shrink-0">
											<Skeleton className="w-[36px] h-[36px] rounded-full shrink-0" />
										</div>
										<div className="flex flex-col grow gap-1">
											<Skeleton className="h-4 w-full grow" />
											<Skeleton className="h-2 w-full grow mt-1" />
										</div>
									</div>
								)
							})
						) : (
							<div className="flex flex-col items-center justify-center p-4 w-full h-full text-center">
								{search.length > 0 ? (
									<>
										<SearchIcon
											className="text-muted-foreground"
											size={32}
										/>
										<p className="text-muted-foreground max-w-[100%] line-clamp-2 text-ellipsis break-all mt-2 text-center">
											{t("innerSideBar.chats.emptySearch", { search })}
										</p>
										<p
											className="text-blue-500 hover:underline cursor-pointer text-sm"
											onClick={create}
										>
											{t("innerSideBar.chats.emptyCreate")}
										</p>
									</>
								) : (
									<>
										<p className="text-muted-foreground">{t("innerSideBar.chats.empty")}</p>
										<p
											className="text-blue-500 cursor-pointer hover:underline"
											onClick={create}
										>
											{t("innerSideBar.chats.emptyCreate")}
										</p>
									</>
								)}
							</div>
						)}
					</div>
				)
			}
		}
	}, [showSkeletons, t, create, search])

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (event.type === "chatMessageNew" && !processedMessageUUIDs[event.data.uuid]) {
					// eslint-disable-next-line react-compiler/react-compiler
					processedMessageUUIDs[event.data.uuid] = true

					const filteredConversations = conversations.filter(c => c.uuid === event.data.conversation)

					if (filteredConversations.length === 0 || !filteredConversations[0]) {
						await query.refetch()

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
							[event.data.conversation]: (prev[event.data.conversation] ?? 0) + 1
						}))
					}
				} else if (event.type === "chatConversationParticipantLeft") {
					setConversations(prev =>
						prev.map(c =>
							c.uuid === event.data.uuid
								? {
										...c,
										participants: c.participants.filter(p => p.userId !== event.data.userId)
									}
								: c
						)
					)

					setSelectedConversation(prev =>
						prev
							? prev.uuid === event.data.uuid
								? {
										...prev,
										participants: prev.participants.filter(p => p.userId !== event.data.userId)
									}
								: prev
							: prev
					)
				} else if (event.type === "chatConversationParticipantNew") {
					setConversations(prev =>
						prev.map(c =>
							c.uuid === event.data.conversation
								? {
										...c,
										participants: [
											...c.participants.filter(p => p.userId !== event.data.userId),
											{
												userId: event.data.userId,
												email: event.data.email,
												avatar: event.data.avatar,
												nickName: event.data.nickName ? event.data.nickName : "",
												metadata: event.data.metadata,
												permissionsAdd: event.data.permissionsAdd,
												addedTimestamp: event.data.addedTimestamp
											}
										]
									}
								: c
						)
					)

					setSelectedConversation(prev =>
						prev
							? prev.uuid === event.data.conversation
								? {
										...prev,
										participants: [
											...prev.participants.filter(p => p.userId !== event.data.userId),
											{
												userId: event.data.userId,
												email: event.data.email,
												avatar: event.data.avatar,
												nickName: event.data.nickName ? event.data.nickName : "",
												metadata: event.data.metadata,
												permissionsAdd: event.data.permissionsAdd,
												addedTimestamp: event.data.addedTimestamp
											}
										]
									}
								: prev
							: prev
					)
				} else if (
					event.type === "chatMessageDelete" ||
					event.type === "chatMessageEdited" ||
					event.type === "chatConversationNameEdited"
				) {
					await query.refetch()
				} else if (event.type === "chatConversationDeleted") {
					const conversationsWithoutDeleted = sortAndFilterConversations(
						conversations.filter(c => c.uuid !== event.data.uuid),
						"",
						userId
					)

					if (routeParent === event.data.uuid) {
						if (conversationsWithoutDeleted.length > 0 && conversationsWithoutDeleted[0]) {
							setLastSelectedChatsConversation(conversationsWithoutDeleted[0].uuid)
							setSelectedConversation(conversationsWithoutDeleted[0])

							navigate({
								to: "/chats/$uuid",
								params: {
									uuid: conversationsWithoutDeleted[0].uuid
								}
							})
						} else {
							navigate({
								to: "/chats"
							})
						}
					}

					await query.refetch()
				}
			} catch (e) {
				console.error(e)
			}
		},
		[
			conversations,
			setConversations,
			query,
			setSelectedConversation,
			routeParent,
			navigate,
			setConversationsUnread,
			userId,
			setLastSelectedChatsConversation
		]
	)

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	useEffect(() => {
		if (
			validateUUID(routeParent) &&
			selectedConversation &&
			conversationsSorted.length > 0 &&
			selectedConversation.uuid === routeParent &&
			virtuosoRef.current &&
			lastAutoScrollConversationUUIDRef.current !== selectedConversation.uuid
		) {
			lastAutoScrollConversationUUIDRef.current = selectedConversation.uuid

			const index = conversationsSorted.findIndex(conversation => conversation.uuid === selectedConversation.uuid)

			if (index === -1) {
				return
			}

			virtuosoRef.current.scrollToIndex({
				index,
				align: "center",
				behavior: "auto"
			})
		}
	}, [conversationsSorted, routeParent, selectedConversation])

	useEffect(() => {
		if (conversationsSorted.length > 0 && conversationsSorted[0]) {
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
					const foundConvo = conversationsSorted.filter(note => note.uuid === routeParent)

					if (foundConvo.length === 1 && foundConvo[0]) {
						setLastSelectedChatsConversation(foundConvo[0].uuid)
						setSelectedConversation(foundConvo[0])

						navigate({
							to: "/chats/$uuid",
							params: {
								uuid: foundConvo[0].uuid
							}
						})
					}
				} else {
					if (!conversationsSorted.some(conversation => conversation.uuid === selectedConversation.uuid)) {
						setLastSelectedChatsConversation("")
						setSelectedConversation(null)

						navigate({
							to: "/chats"
						})
					}
				}
			}
		} else {
			if (selectedConversation) {
				setLastSelectedChatsConversation("")
				setSelectedConversation(null)

				navigate({
					to: "/chats"
				})
			}
		}
	}, [navigate, routeParent, conversationsSorted, setLastSelectedChatsConversation, setSelectedConversation, selectedConversation])

	useEffect(() => {
		if (query.isSuccess && query.dataUpdatedAt !== queryUpdatedAtRef.current) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			setConversations(query.data)
			setSelectedConversation(prev => {
				if (!prev) {
					return prev
				}

				for (const convo of query.data) {
					if (convo.uuid === prev.uuid) {
						return convo
					}
				}

				return prev
			})
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, setConversations, setSelectedConversation])

	useEffect(() => {
		const socket = getSocket()

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
		<Virtuoso
			data={conversationsSorted}
			totalCount={conversationsSorted.length}
			height={virtuosoHeight}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			components={components}
			style={style}
		/>
	)
})

export default Chats
