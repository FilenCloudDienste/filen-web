import { memo, useRef, useEffect, useMemo, useCallback, useState, Fragment } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import useElementDimensions from "@/hooks/useElementDimensions"
import useWindowSize from "@/hooks/useWindowSize"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import { useChatsStore } from "@/stores/chats.store"
import Message, { Header } from "./message"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import socket from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import MarkAsRead from "./markAsRead"
import useErrorToast from "@/hooks/useErrorToast"
import useRouteParent from "@/hooks/useRouteParent"
import eventEmitter from "@/lib/eventEmitter"
import { Skeleton } from "@/components/ui/skeleton"

export const Messages = memo(({ conversation }: { conversation: ChatConversation }) => {
	const windowSize = useWindowSize()
	const inputContainerDimensions = useElementDimensions("chat-input-container")
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const { messages, setMessages } = useChatsStore()
	const queryUpdatedAtRef = useRef<number>(-1)
	const [isScrolling, setIsScrolling] = useState<boolean>(false)
	const isFetchingPreviousMessagesRef = useRef<boolean>(false)
	const errorToast = useErrorToast()
	const routeParent = useRouteParent()
	const lastConversationUUID = useRef<string>("")
	const [lastFocus, setLastFocus] = useState<number>(-1)

	const virtuosoHeight = useMemo(() => {
		return inputContainerDimensions.height > 0
			? windowSize.height - inputContainerDimensions.height - 48 - DESKTOP_TOPBAR_HEIGHT
			: windowSize.height - 82 - 48 - DESKTOP_TOPBAR_HEIGHT
	}, [inputContainerDimensions.height, windowSize.height])

	const messagesSorted = useMemo(() => {
		return messages.sort((a, b) => a.sentTimestamp - b.sentTimestamp)
	}, [messages])

	const query = useQuery({
		queryKey: ["fetchChatsConversationsMessages", conversation.uuid],
		queryFn: () => worker.fetchChatsConversationsMessages({ uuid: conversation.uuid })
	})

	const lastFocusQuery = useQuery({
		queryKey: ["chatLastFocus"],
		queryFn: () => worker.chatLastFocus()
	})

	const lastFocusQueryNumber = useMemo((): number => {
		if (!lastFocusQuery.isSuccess) {
			return Date.now()
		}

		const filtered = lastFocusQuery.data.filter(lf => lf.uuid === conversation.uuid)

		if (filtered.length === 0 || !filtered[0]) {
			return -1
		}

		return filtered[0].lastFocus
	}, [lastFocusQuery.isSuccess, lastFocusQuery.data, conversation.uuid])

	const showSkeletons = useMemo(() => {
		if (query.isSuccess && query.data.length >= 0) {
			return false
		}

		return true
	}, [query.data, query.isSuccess])

	const fetchPreviousMessages = useCallback(async () => {
		if (messagesSorted.length === 0 || isFetchingPreviousMessagesRef.current) {
			return
		}

		isFetchingPreviousMessagesRef.current = true

		try {
			const firstMessage = messagesSorted.at(0)

			if (!firstMessage) {
				return
			}

			const previousMessages = await worker.fetchChatsConversationsMessages({
				uuid: conversation.uuid,
				timestamp: firstMessage.sentTimestamp
			})

			const previousMessagesUUIDs = previousMessages.map(m => m.uuid)

			setMessages(prev => [
				...previousMessages.filter(m => m.conversation === conversation.uuid),
				...prev.filter(m => !previousMessagesUUIDs.includes(m.uuid) && m.conversation === conversation.uuid)
			])
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			isFetchingPreviousMessagesRef.current = false
		}
	}, [messagesSorted, setMessages, errorToast, conversation.uuid])

	const startReached = useCallback(() => {
		fetchPreviousMessages()
	}, [fetchPreviousMessages])

	const getItemKey = useCallback((_: number, message: ChatMessage) => `${JSON.stringify(message)}`, [])

	const itemContent = useCallback(
		(index: number, message: ChatMessage) => {
			return (
				<Message
					conversation={conversation}
					message={message}
					prevMessage={messages[index - 1]}
					nextMessage={messages[index + 1]}
					isScrolling={isScrolling}
					lastFocus={lastFocus > 0 ? lastFocus : lastFocusQueryNumber}
				/>
			)
		},
		[conversation, messages, isScrolling, lastFocus, lastFocusQueryNumber]
	)

	const scrollChatToBottom = useCallback(
		(behavior: "auto" | "smooth" = "auto") => {
			if (!virtuosoRef.current) {
				return
			}

			virtuosoRef.current.scrollIntoView({
				align: "end",
				behavior,
				index: messagesSorted.length > 0 ? messagesSorted.length - 1 : 99
			})
		},
		[messagesSorted.length]
	)

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div
						className="flex flex-col w-full h-full overflow-hidden py-3"
						style={{
							transform: "scaleY(-1)"
						}}
					>
						{showSkeletons ? (
							new Array(100).fill(1).map((_, index) => {
								return (
									<div
										key={index}
										className="flex flex-row h-auto p-1 px-5 gap-3 mb-3"
										style={{
											transform: "scaleY(-1)"
										}}
									>
										<Skeleton className="w-[36px] h-[36px] rounded-full shrink-0" />
										<div className="flex flex-col grow gap-2">
											<Skeleton className="w-[200px] rounded-md h-4" />
											<Skeleton className="w-[50%] rounded-md h-3" />
											<Skeleton className="w-[30%] rounded-md h-3" />
											<Skeleton className="w-[10%] rounded-md h-3" />
										</div>
									</div>
								)
							})
						) : (
							<div
								className="flex flex-row px-5 pb-2"
								style={{
									transform: "scaleY(-1)"
								}}
							>
								<Header />
							</div>
						)}
					</div>
				)
			}
		}
	}, [showSkeletons])

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (event.type === "chatMessageNew") {
					if (event.data.conversation !== conversation.uuid) {
						return
					}

					const key = await worker.chatKey({ conversation: conversation.uuid })
					const [message, replyToMessageDecrypted] = await Promise.all([
						worker.decryptChatMessage({ message: event.data.message, key }),
						event.data.replyTo.uuid.length > 0 && event.data.replyTo.message.length > 0
							? worker.decryptChatMessage({ message: event.data.replyTo.message, key })
							: Promise.resolve("")
					])

					if (message.length === 0) {
						return
					}

					setMessages(prev => [
						...prev.filter(m => m.uuid !== event.data.uuid),
						{
							conversation: event.data.conversation,
							uuid: event.data.uuid,
							senderId: event.data.senderId,
							senderEmail: event.data.senderEmail,
							senderAvatar: event.data.senderAvatar,
							senderNickName: event.data.senderNickName,
							message,
							replyTo: {
								...event.data.replyTo,
								message: replyToMessageDecrypted
							},
							embedDisabled: event.data.embedDisabled,
							edited: false,
							editedTimestamp: 0,
							sentTimestamp: event.data.sentTimestamp
						}
					])
				} else if (event.type === "chatMessageDelete") {
					setMessages(prev => prev.filter(message => message.uuid !== event.data.uuid))
				} else if (event.type === "chatMessageEdited") {
					if (event.data.conversation !== conversation.uuid) {
						return
					}

					const key = await worker.chatKey({ conversation: conversation.uuid })
					const messageDecrypted = await worker.decryptChatMessage({ message: event.data.message, key })

					if (messageDecrypted.length === 0) {
						return
					}

					setMessages(prev =>
						prev.map(message =>
							message.uuid === event.data.uuid
								? {
										...message,
										edited: true,
										editedTimestamp: event.data.editedTimestamp,
										message: messageDecrypted
									}
								: message
						)
					)
				} else if (event.type === "chatMessageEmbedDisabled") {
					setMessages(prev =>
						prev.map(message =>
							message.uuid === event.data.uuid
								? {
										...message,
										embedDisabled: true
									}
								: message
						)
					)
				}
			} catch (e) {
				console.error(e)
			}
		},
		[setMessages, conversation.uuid]
	)

	useEffect(() => {
		if (query.isSuccess && query.dataUpdatedAt !== queryUpdatedAtRef.current) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			setMessages(prev => {
				const previousMessagesUUIDs = query.data.map(m => m.uuid)

				return [
					...query.data.filter(m => m.conversation === routeParent),
					...prev.filter(m => !previousMessagesUUIDs.includes(m.uuid) && m.conversation === routeParent)
				]
			})
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, setMessages, routeParent])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		const scrollChatToBottomListener = eventEmitter.on("scrollChatToBottom", behavior => {
			scrollChatToBottom(behavior)
		})

		return () => {
			socket.removeListener("socketEvent", socketEventListener)

			scrollChatToBottomListener.remove()
		}
	}, [socketEventListener, scrollChatToBottom])

	useEffect(() => {
		if (lastConversationUUID.current !== conversation.uuid) {
			lastConversationUUID.current = conversation.uuid
		}

		return () => {
			lastConversationUUID.current = ""
		}
	}, [conversation.uuid, scrollChatToBottom])

	useEffect(() => {
		if (!lastFocusQuery.isSuccess) {
			return
		}

		const filtered = lastFocusQuery.data.filter(lf => lf.uuid === conversation.uuid)

		if (filtered.length === 0 || !filtered[0]) {
			return
		}

		setLastFocus(filtered[0].lastFocus)
	}, [lastFocusQuery.isSuccess, lastFocusQuery.data, conversation.uuid])

	return (
		<Fragment>
			<MarkAsRead
				lastFocus={lastFocus > 0 ? lastFocus : lastFocusQueryNumber}
				lastFocusValues={lastFocusQuery.isSuccess ? lastFocusQuery.data : []}
				setLastFocus={setLastFocus}
				messagesSorted={messagesSorted}
				conversation={conversation}
			/>
			<Virtuoso
				ref={virtuosoRef}
				data={messagesSorted}
				totalCount={messagesSorted.length}
				height={virtuosoHeight}
				width="100%"
				atBottomThreshold={100}
				alignToBottom={true}
				computeItemKey={getItemKey}
				isScrolling={setIsScrolling}
				initialTopMostItemIndex={9999}
				itemContent={itemContent}
				atTopThreshold={500}
				followOutput={true}
				startReached={startReached}
				components={components}
				overscan={windowSize.height}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: virtuosoHeight + "px",
					width: "100%"
				}}
			/>
		</Fragment>
	)
})

export default Messages
