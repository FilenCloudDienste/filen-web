import { memo, type SetStateAction, useCallback, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import ContextMenu from "./contextMenu"
import { ReplaceMessageWithComponentsInline } from "@/components/chats/conversation/message/utils"
import { useChatsStore } from "@/stores/chats.store"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { getConversationName } from "../utils"
import ChatAvatar from "@/components/chatAvatar"

export const Chat = memo(
	({
		conversation,
		setLastSelectedChatsConversation,
		setSelectedConversation,
		userId,
		routeParent
	}: {
		conversation: ChatConversation
		setLastSelectedChatsConversation: (value: SetStateAction<string>) => void
		setSelectedConversation: (fn: ChatConversation | ((prev: ChatConversation | null) => ChatConversation | null) | null) => void
		userId: number
		routeParent: string
	}) => {
		const { conversationsUnread, setConversationsUnread } = useChatsStore()

		const query = useQuery({
			queryKey: ["chatConversationUnreadCount", conversation.uuid],
			queryFn: () => worker.chatConversationUnreadCount({ conversation: conversation.uuid })
		})

		const unreadCount = useMemo(() => {
			return conversationsUnread[conversation.uuid] ? conversationsUnread[conversation.uuid]! : 0
		}, [conversationsUnread, conversation.uuid])

		const lastMessageSenderName = useMemo(() => {
			const foundSender = conversation.participants.filter(p => p.userId === conversation.lastMessageSender)

			if (foundSender.length !== 1 || !foundSender[0]) {
				return "UnknownUser"
			}

			return foundSender[0].nickName.length > 0 ? foundSender[0].nickName : foundSender[0].email
		}, [conversation.participants, conversation.lastMessageSender])

		const select = useCallback(() => {
			query.refetch().catch(console.error)

			setLastSelectedChatsConversation(conversation.uuid)
			setSelectedConversation(conversation)
		}, [setSelectedConversation, conversation, setLastSelectedChatsConversation, query])

		useEffect(() => {
			if (query.isSuccess) {
				setConversationsUnread(prev => {
					const newRecord = { ...prev }

					if (query.data === 0) {
						delete newRecord[conversation.uuid]
					} else {
						newRecord[conversation.uuid] = query.data
					}

					return newRecord
				})
			}
		}, [query.isSuccess, query.data, setConversationsUnread, conversation.uuid])

		return (
			<ContextMenu conversation={conversation}>
				<Link
					className={cn(
						"flex flex-row gap-3 p-3 border-l-[3px] hover:bg-secondary h-full items-center",
						routeParent === conversation.uuid ? "border-l-blue-500 bg-secondary" : "border-transparent"
					)}
					draggable={false}
					to="/chats/$uuid"
					params={{
						uuid: conversation.uuid
					}}
					onClick={select}
				>
					<div className="flex flex-row h-full">
						<ChatAvatar
							size={36}
							className="shrink-0"
							participants={conversation.participants}
						/>
						{unreadCount > 0 && (
							<div className="absolute z-10 w-[16px] h-[16px] rounded-full bg-red-500 text-white flex flex-row items-center justify-center text-xs mt-[26px] ml-[26px]">
								{unreadCount >= 9 ? "9+" : unreadCount}
							</div>
						)}
					</div>
					<div className="flex flex-col grow h-full">
						<p className="line-clamp-1 text-ellipsis break-all">{getConversationName(conversation, userId)}</p>
						{conversation.lastMessage && conversation.lastMessage.length > 0 && (
							<div className="text-muted-foreground line-clamp-1 text-ellipsis break-all text-sm flex flex-row overflow-hidden gap-1">
								<p className="shrink-0">{lastMessageSenderName}:</p>
								<ReplaceMessageWithComponentsInline
									content={conversation.lastMessage}
									participants={conversation.participants}
								/>
							</div>
						)}
					</div>
				</Link>
			</ContextMenu>
		)
	}
)

export default Chat
