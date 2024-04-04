import { memo } from "react"
import { ContextMenu as CM, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"

export const ContextMenu = memo(({ conversation, children }: { conversation: ChatConversation; children: React.ReactNode }) => {
	const { t } = useTranslation()

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				<ContextMenuItem
					onClick={() => {}}
					className="cursor-pointer"
				>
					{conversation.lastMessage}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
