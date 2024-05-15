import { memo, useMemo, useCallback } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useSDKConfig from "@/hooks/useSDKConfig"
import Avatar from "@/components/avatar"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { useLocalStorage } from "@uidotdev/usehooks"
import { cn } from "@/lib/utils"
import eventEmitter from "@/lib/eventEmitter"
import { useTheme } from "@/providers/themeProvider"

export const TopBar = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { userId } = useSDKConfig()
	const { t } = useTranslation()
	const [conversationParticipantsContainerOpen, setConversationParticipantsContainerOpen] = useLocalStorage<boolean>(
		`conversationParticipantsContainerOpen:${conversation.uuid}`,
		true
	)
	const { dark } = useTheme()

	const participantsWithoutUser = useMemo(() => {
		return conversation.participants.filter(p => p.userId !== userId)
	}, [conversation.participants, userId])

	const hasWritePermissions = useMemo(() => {
		return userId === conversation.ownerId
	}, [userId, conversation.ownerId])

	const editConversationName = useCallback(() => {
		if (!hasWritePermissions) {
			return
		}

		eventEmitter.emit("editConversationName", conversation.uuid)
	}, [conversation.uuid, hasWritePermissions])

	const toggleParticipantsContainer = useCallback(() => {
		setConversationParticipantsContainerOpen(prev => !prev)
	}, [setConversationParticipantsContainerOpen])

	return (
		<div
			className={cn(
				"w-full h-12 flex flex-row px-4 border-b shadow-sm items-center gap-2 justify-between shrink-0 z-[10001] select-none",
				dark ? "bg-[#151518]" : ""
			)}
		>
			<div
				className={cn("flex flex-row gap-2 items-center", hasWritePermissions ? "cursor-pointer" : "cursor-default")}
				onClick={editConversationName}
			>
				<Avatar
					size={24}
					src={participantsWithoutUser[0]?.avatar}
				/>
				<p className="line-clamp-1 text-ellipsis break-all">
					{conversation.name && conversation.name.length > 0
						? conversation.name
						: participantsWithoutUser[0]?.nickName.length > 0
							? participantsWithoutUser[0]?.nickName
							: participantsWithoutUser[0]?.email}
				</p>
			</div>
			<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<div
							className="hover:bg-secondary rounded-md p-1 cursor-pointer"
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
