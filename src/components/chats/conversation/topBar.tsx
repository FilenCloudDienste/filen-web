import { memo, useMemo, useCallback } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useSDKConfig from "@/hooks/useSDKConfig"
import Avatar from "@/components/avatar"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { useLocalStorage } from "@uidotdev/usehooks"

export const TopBar = memo(({ conversation }: { conversation: ChatConversation }) => {
	const sdkConfig = useSDKConfig()
	const { t } = useTranslation()
	const [conversationParticipantsContainerOpen, setConversationParticipantsContainerOpen] = useLocalStorage<boolean>(
		`conversationParticipantsContainerOpen:${conversation.uuid}`,
		true
	)

	const participantsWithoutUser = useMemo(() => {
		return conversation.participants.filter(p => p.userId !== sdkConfig.userId)
	}, [conversation.participants, sdkConfig.userId])

	const toggleParticipantsContainer = useCallback(() => {
		setConversationParticipantsContainerOpen(prev => !prev)
	}, [setConversationParticipantsContainerOpen])

	return (
		<div className="w-full h-12 flex flex-row px-4 border-b shadow-sm items-center gap-2 justify-between shrink-0">
			<div className="flex flex-row gap-2 items-center">
				<Avatar
					className="w-6 h-6"
					src={participantsWithoutUser[0].avatar}
					fallback={participantsWithoutUser[0].email}
				/>
				<p className="line-clamp-1 text-ellipsis break-all">
					{conversation.name && conversation.name.length > 0
						? conversation.name
						: participantsWithoutUser[0].nickName.length > 0
							? participantsWithoutUser[0].nickName
							: participantsWithoutUser[0].email}
				</p>
			</div>
			<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<div
							className="hover:bg-secondary rounded-lg p-1 cursor-pointer"
							onClick={toggleParticipantsContainer}
						>
							{conversationParticipantsContainerOpen ? <ChevronRight /> : <ChevronLeft />}
						</div>
					</TooltipTrigger>
					<TooltipContent side="left">
						<p>{t("innerSideBar.notes.createNote")}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
})

export default TopBar
