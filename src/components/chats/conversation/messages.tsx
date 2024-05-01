import { memo, useRef, useEffect, useMemo, useCallback, useState, Fragment } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import useElementDimensions from "@/hooks/useElementDimensions"
import useWindowSize from "@/hooks/useWindowSize"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { useChatsStore } from "@/stores/chats.store"
import Message from "./message"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { IS_DESKTOP } from "@/constants"
import socket from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import useSDKConfig from "@/hooks/useSDKConfig"
import MarkAsRead from "./markAsRead"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useRouteParent from "@/hooks/useRouteParent"

export const Messages = memo(({ conversation }: { conversation: ChatConversation }) => {
	const windowSize = useWindowSize()
	const inputContainerDimensions = useElementDimensions("chat-input-container")
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const { messages, setMessages, failedMessages, editUUID, replyMessage, setReplyMessage, setEditUUID } = useChatsStore()
	const queryUpdatedAtRef = useRef<number>(-1)
	const { userId } = useSDKConfig()
	const [isScrolling, setIsScrolling] = useState<boolean>(false)
	const { t } = useTranslation()
	const isFetchingPreviousMessagesRef = useRef<boolean>(false)
	const errorToast = useErrorToast()
	const routeParent = useRouteParent()

	const virtuosoHeight = useMemo(() => {
		return inputContainerDimensions.height > 0
			? windowSize.height - inputContainerDimensions.height - 48 - (IS_DESKTOP ? 24 : 0)
			: windowSize.height - 82 - 48 - (IS_DESKTOP ? 24 : 0)
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

	const lastFocus = useMemo((): number => {
		if (!lastFocusQuery.isSuccess) {
			return Date.now()
		}

		const filtered = lastFocusQuery.data.filter(lf => lf.uuid === conversation.uuid)

		if (filtered.length === 0) {
			return Date.now()
		}

		return filtered[0].lastFocus
	}, [lastFocusQuery.isSuccess, lastFocusQuery.data, conversation.uuid])

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

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
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
				<div
					key={getItemKey(index, message)}
					style={{
						overflowAnchor: "none"
					}}
				>
					<Message
						conversation={conversation}
						message={message}
						prevMessage={messages[index - 1]}
						nextMessage={messages[index + 1]}
						userId={userId}
						isScrolling={isScrolling}
						lastFocus={lastFocus}
						t={t}
						failedMessages={failedMessages}
						editUUID={editUUID}
						replyUUID={replyMessage ? replyMessage.uuid : ""}
						setReplyMessage={setReplyMessage}
						setEditUUID={setEditUUID}
					/>
				</div>
			)
		},
		[
			conversation,
			getItemKey,
			messages,
			userId,
			isScrolling,
			lastFocus,
			t,
			failedMessages,
			editUUID,
			replyMessage,
			setReplyMessage,
			setEditUUID
		]
	)

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (event.type === "chatMessageNew") {
					if (event.data.conversation !== conversation.uuid) {
						return
					}

					const key = await worker.chatKey({ conversation: conversation.uuid })
					const message = await worker.decryptChatMessage({ message: event.data.message, key })
					const replyToMessageDecrypted =
						event.data.replyTo.uuid.length > 0 && event.data.replyTo.message.length > 0
							? await worker.decryptChatMessage({ message: event.data.replyTo.message, key })
							: ""

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

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	return (
		<Fragment key={`messages-${conversation.uuid}`}>
			<MarkAsRead
				lastFocus={lastFocus}
				lastFocusQuery={lastFocusQuery}
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
				initialTopMostItemIndex={99}
				defaultItemHeight={57}
				itemContent={itemContent}
				atTopThreshold={500}
				followOutput={true}
				startReached={startReached}
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
