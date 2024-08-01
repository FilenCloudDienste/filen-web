import { memo, useMemo, useCallback } from "react"
import useIsMobile from "@/hooks/useIsMobile"
import Conversation from "./conversation"
import Participants from "./participants"
import { useChatsStore } from "@/stores/chats.store"
import { useLocalStorage } from "@uidotdev/usehooks"
import EmojiMartData from "@emoji-mart/data"
import { init as initEmojiMart } from "emoji-mart"
import useMountedEffect from "@/hooks/useMountedEffect"
import { customEmojis } from "./customEmojis"
import { useTranslation } from "react-i18next"
import { MessageCircle, Plus } from "lucide-react"
import { Button } from "../ui/button"
import eventEmitter from "@/lib/eventEmitter"
import useSDKConfig from "@/hooks/useSDKConfig"
import { sortAndFilterConversations } from "../mainContainer/innerSideBar/chats/utils"

export const Chats = memo(() => {
	const isMobile = useIsMobile()
	const { userId } = useSDKConfig()
	const { selectedConversation, setReplyMessage, setEditUUID, conversationSorted } = useChatsStore(
		useCallback(
			state => ({
				selectedConversation: state.selectedConversation,
				setReplyMessage: state.setReplyMessage,
				setEditUUID: state.setEditUUID,
				conversationSorted: sortAndFilterConversations(state.conversations, "", userId)
			}),
			[userId]
		)
	)
	const [conversationParticipantsContainerOpen] = useLocalStorage<boolean>(
		`conversationParticipantsContainerOpen:${selectedConversation?.uuid}`,
		true
	)
	const { t } = useTranslation()

	const showParticipants = useMemo(() => {
		if ((selectedConversation && selectedConversation.participants.length <= 2) || isMobile) {
			return false
		}

		return conversationParticipantsContainerOpen
	}, [isMobile, selectedConversation, conversationParticipantsContainerOpen])

	const create = useCallback(() => {
		eventEmitter.emit("createChat")
	}, [])

	useMountedEffect(() => {
		setReplyMessage(null)
		setEditUUID("")

		initEmojiMart({
			data: EmojiMartData,
			custom: [
				{
					emojis: customEmojis
				}
			]
		}).catch(console.error)
	})

	return (
		<div className="w-full h-[100dvh] flex flex-row">
			{conversationSorted.length === 0 ? (
				<div className="flex flex-row items-center justify-center w-full h-full">
					<div className="flex flex-col p-4 justify-center items-center">
						<MessageCircle
							width={128}
							height={128}
							className="text-muted-foreground"
						/>
						<p className="text-xl text-center mt-4">{t("chats.empty.title")}</p>
						<p className="text-muted-foreground text-center">{t("chats.empty.description")}</p>
						<Button
							variant="secondary"
							className="items-center gap-2 mt-4"
							onClick={create}
						>
							<Plus size={16} />
							{t("chats.empty.create")}
						</Button>
					</div>
				</div>
			) : (
				<>
					<div className="flex flex-col grow">
						{selectedConversation && (
							<Conversation
								key={`conversation-${selectedConversation.uuid}`}
								conversation={selectedConversation}
							/>
						)}
					</div>
					{showParticipants && selectedConversation && !isMobile && (
						<div className="flex flex-col w-[200px] border-l">
							<Participants
								key={`participants-${selectedConversation.uuid}`}
								conversation={selectedConversation}
							/>
						</div>
					)}
				</>
			)}
		</div>
	)
})

export default Chats
