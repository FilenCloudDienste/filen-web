import { memo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import worker from "@/lib/worker"
import TopBar from "./topBar"

export const Conversation = memo(({ conversation }: { conversation: ChatConversation }) => {
	const query = useQuery({
		queryKey: ["fetchChatsConversationsMessages", conversation.uuid],
		queryFn: () => worker.fetchChatsConversationsMessages({ uuid: conversation.uuid })
	})

	console.log(query.data)

	return (
		<div className="w-full h-full flex flex-col">
			<TopBar conversation={conversation} />
		</div>
	)
})

export default Conversation
