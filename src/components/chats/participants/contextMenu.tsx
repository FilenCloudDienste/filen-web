import { memo } from "react"
import { ContextMenu as CM, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"

export const ContextMenu = memo(({ participant, children }: { participant: ChatConversationParticipant; children: React.ReactNode }) => {
	const { t } = useTranslation()

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				<ContextMenuItem
					onClick={() => {}}
					className="cursor-pointer"
				>
					{participant.email}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
