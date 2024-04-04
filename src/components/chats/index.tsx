import { memo } from "react"
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from "../ui/resizable"
import useIsMobile from "@/hooks/useIsMobile"
import Conversation from "./conversation"
import Participants from "./participants"
import { useChatsStore } from "@/stores/chats.store"
import { useLocalStorage } from "@uidotdev/usehooks"

export const Chats = memo(() => {
	const isMobile = useIsMobile()
	const { selectedConversation } = useChatsStore()
	const [conversationParticipantsContainerOpen] = useLocalStorage<boolean>("conversationParticipantsContainerOpen", true)

	return (
		<div className="w-full h-screen flex flex-row">
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel
					defaultSize={80}
					minSize={50}
					maxSize={80}
					order={1}
				>
					{selectedConversation && <Conversation conversation={selectedConversation} />}
				</ResizablePanel>
				<ResizableHandle className="bg-transparent w-0" />
				{conversationParticipantsContainerOpen && !isMobile && (
					<ResizablePanel
						defaultSize={20}
						minSize={20}
						maxSize={30}
						order={2}
						className="border-l"
					>
						{selectedConversation && <Participants conversation={selectedConversation} />}
					</ResizablePanel>
				)}
			</ResizablePanelGroup>
		</div>
	)
})

export default Chats
