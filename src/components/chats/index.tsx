import { memo, useState } from "react"
import useIsMobile from "@/hooks/useIsMobile"
import Conversation from "./conversation"
import Participants from "./participants"
import { useChatsStore } from "@/stores/chats.store"
import { useLocalStorage } from "@uidotdev/usehooks"
import EmojiMartData from "@emoji-mart/data"
import { init as initEmojiMart } from "emoji-mart"
import useMountedEffect from "@/hooks/useMountedEffect"
import { customEmojis } from "./customEmojis"

let didInitializeEmojisPreviously = false

export const Chats = memo(() => {
	const isMobile = useIsMobile()
	const { selectedConversation, setReplyMessage, setEditUUID } = useChatsStore()
	const [conversationParticipantsContainerOpen] = useLocalStorage<boolean>(
		`conversationParticipantsContainerOpen:${selectedConversation?.uuid}`,
		true
	)
	const [emojisInitialized, setEmojisInitialized] = useState<boolean>(didInitializeEmojisPreviously)

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
		})
			.then(() => {
				didInitializeEmojisPreviously = true

				setEmojisInitialized(true)
			})
			.catch(console.error)
	})

	if (!emojisInitialized) {
		return null
	}

	return (
		<div className="w-full h-screen flex flex-row">
			<div className="flex flex-col grow">
				{selectedConversation && (
					<Conversation
						key={`conversation-${selectedConversation.uuid}`}
						conversation={selectedConversation}
					/>
				)}
			</div>
			{conversationParticipantsContainerOpen && !isMobile && (
				<div className="flex flex-col w-[200px] border-l">
					{selectedConversation && (
						<Participants
							key={`participants-${selectedConversation.uuid}`}
							conversation={selectedConversation}
						/>
					)}
				</div>
			)}
		</div>
	)
})

export default Chats
