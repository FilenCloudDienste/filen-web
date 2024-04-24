import { memo, type SetStateAction, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import ContextMenu from "./contextMenu"
import Avatar from "@/components/avatar"
import { ReplaceMessageWithComponentsInline } from "@/components/chats/conversation/message/utils"
import { useChatsStore } from "@/stores/chats.store"

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
		const { conversationsUnread } = useChatsStore()

		const unreadCount = useMemo(() => {
			return conversationsUnread[conversation.uuid] ? conversationsUnread[conversation.uuid] : 0
		}, [conversationsUnread, conversation.uuid])

		const participantsWithoutUser = useMemo(() => {
			return conversation.participants.filter(p => p.userId !== userId)
		}, [conversation.participants, userId])

		const lastMessageSenderName = useMemo(() => {
			const foundSender = conversation.participants.filter(p => p.userId === conversation.lastMessageSender)

			if (!foundSender) {
				return "UnknownUser"
			}

			return foundSender[0].nickName.length > 0 ? foundSender[0].nickName : foundSender[0].email
		}, [conversation.participants, conversation.lastMessageSender])

		const select = useCallback(() => {
			setLastSelectedChatsConversation(conversation.uuid)
			setSelectedConversation(conversation)
		}, [setSelectedConversation, conversation, setLastSelectedChatsConversation])

		return (
			<ContextMenu conversation={conversation}>
				<Link
					className={cn(
						"flex flex-row gap-3 p-3 border-l-[3px] hover:bg-primary-foreground h-full items-center",
						routeParent === conversation.uuid ? "border-l-blue-500 bg-primary-foreground" : "border-transparent"
					)}
					to="/chats/$uuid"
					params={{
						uuid: conversation.uuid
					}}
					onClick={select}
				>
					<div className="flex flex-row h-full">
						<Avatar
							className="w-10 h-10 shrink-0"
							src={participantsWithoutUser[0].avatar}
							fallback={participantsWithoutUser[0].email}
						/>
						{unreadCount > 0 && (
							<div className="absolute z-10 w-[16px] h-[16px] rounded-full bg-red-500 text-white flex flex-row items-center justify-center text-xs mt-[26px] ml-[26px]">
								{unreadCount >= 9 ? "9+" : unreadCount}
							</div>
						)}
					</div>
					<div className="flex flex-col grow h-full">
						<p className="line-clamp-1 text-ellipsis break-all">
							{conversation.name && conversation.name.length > 0
								? conversation.name
								: participantsWithoutUser[0].nickName.length > 0
									? participantsWithoutUser[0].nickName
									: participantsWithoutUser[0].email}
						</p>
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
