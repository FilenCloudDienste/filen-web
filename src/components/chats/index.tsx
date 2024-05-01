import { memo, useState } from "react"
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from "../ui/resizable"
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
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel
					defaultSize={85}
					minSize={20}
					maxSize={85}
					order={1}
				>
					{selectedConversation && (
						<Conversation
							key={`conversation-${selectedConversation.uuid}`}
							conversation={selectedConversation}
						/>
					)}
				</ResizablePanel>
				<ResizableHandle className="bg-transparent w-0" />
				{conversationParticipantsContainerOpen && !isMobile && (
					<ResizablePanel
						defaultSize={15}
						minSize={10}
						maxSize={20}
						order={2}
						className="border-l"
					>
						{selectedConversation && (
							<Participants
								key={`participants-${selectedConversation.uuid}`}
								conversation={selectedConversation}
							/>
						)}
					</ResizablePanel>
				)}
			</ResizablePanelGroup>
		</div>
	)
})

export default Chats
