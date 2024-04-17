import { memo } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import TopBar from "./topBar"
import Input from "./input"
import Messages from "./messages"

export const Conversation = memo(({ conversation }: { conversation: ChatConversation }) => {
	return (
		<div className="w-full h-full flex flex-col">
			<TopBar conversation={conversation} />
			<Messages conversation={conversation} />
			<Input conversation={conversation} />
		</div>
	)
})

export default Conversation
