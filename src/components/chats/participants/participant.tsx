import { memo, useMemo } from "react"
import { Crown } from "lucide-react"
import Avatar from "@/components/avatar"
import ContextMenu from "./contextMenu"
import { type ChatConversationParticipant, type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatConversationsOnlineUser } from "@filen/sdk/dist/types/api/v3/chat/conversations/online"

export const ONLINE_TIMEOUT = 300000

export const Participant = memo(
	({
		participant,
		onlineUsers,
		conversation
	}: {
		participant: ChatConversationParticipant
		onlineUsers: ChatConversationsOnlineUser[]
		conversation: ChatConversation
	}) => {
		const status = useMemo(() => {
			const filtered = onlineUsers.filter(p => p.userId === participant.userId)

			if (filtered.length === 0 || filtered[0].appearOffline) {
				return "offline"
			}

			return filtered[0].lastActive > 0 ? (filtered[0].lastActive > Date.now() - ONLINE_TIMEOUT ? "online" : "offline") : "offline"
		}, [participant.userId, onlineUsers])

		return (
			<ContextMenu
				participant={participant}
				conversation={conversation}
			>
				<div className="flex flex-row items-center p-3 gap-3 cursor-pointer hover:bg-primary-foreground">
					<Avatar
						size={28}
						src={participant.avatar}
						status={status}
					/>
					<div className="flex flex-row items-center gap-3">
						<p className="line-clamp-1 text-ellipsis break-all">{participant.email}</p>
						{participant.userId === conversation.ownerId && (
							<Crown
								size={16}
								className="text-yellow-500 shrink-0"
							/>
						)}
					</div>
				</div>
			</ContextMenu>
		)
	}
)

export default Participant
