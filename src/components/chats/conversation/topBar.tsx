import { memo, useMemo, useCallback } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useSDKConfig from "@/hooks/useSDKConfig"
import { ChevronRight, ChevronLeft, UserRoundPlus } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { useLocalStorage } from "@uidotdev/usehooks"
import { cn } from "@/lib/utils"
import eventEmitter from "@/lib/eventEmitter"
import { useTheme } from "@/providers/themeProvider"
import { selectContacts } from "@/components/dialogs/selectContacts"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { useChatsStore } from "@/stores/chats.store"
import ChatAvatar from "@/components/chatAvatar"
import { getConversationName } from "@/components/mainContainer/innerSideBar/chats/utils"

export const TopBar = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { userId } = useSDKConfig()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { t } = useTranslation()
	const [conversationParticipantsContainerOpen, setConversationParticipantsContainerOpen] = useLocalStorage<boolean>(
		`conversationParticipantsContainerOpen:${conversation.uuid}`,
		true
	)
	const { dark } = useTheme()
	const { setConversations, setSelectedConversation } = useChatsStore()

	const hasWritePermissions = useMemo(() => {
		return userId === conversation.ownerId
	}, [userId, conversation.ownerId])

	const hasAddPermissions = useMemo(() => {
		if (userId === conversation.ownerId) {
			return true
		}

		const found = conversation.participants.filter(p => p.userId === userId)

		if (found.length === 0) {
			return false
		}

		return found[0].permissionsAdd
	}, [userId, conversation.participants, conversation.ownerId])

	const editConversationName = useCallback(() => {
		if (!hasWritePermissions) {
			return
		}

		eventEmitter.emit("editConversationName", conversation.uuid)
	}, [conversation.uuid, hasWritePermissions])

	const toggleParticipantsContainer = useCallback(() => {
		setConversationParticipantsContainerOpen(prev => !prev)
	}, [setConversationParticipantsContainerOpen])

	const addParticipant = useCallback(async () => {
		if (!hasAddPermissions) {
			return
		}

		const selectedContacts = await selectContacts({ excludeUserIds: conversation.participants.map(p => p.userId) })

		if (selectedContacts.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			await Promise.all(
				selectedContacts.contacts.map(contact =>
					worker.chatConversationAddParticipant({ conversation: conversation.uuid, contact })
				)
			)

			eventEmitter.emit("refetchChats")

			const addedUserIds = selectedContacts.contacts.map(c => c.userId)
			const convo: ChatConversation = {
				...conversation,
				participants: [
					...conversation.participants.filter(p => !addedUserIds.includes(p.userId)),
					...selectedContacts.contacts.map(contact => ({
						userId: contact.userId,
						email: contact.email,
						avatar: contact.avatar,
						nickName: contact.nickName,
						metadata: "",
						permissionsAdd: true,
						addedTimestamp: Date.now()
					}))
				]
			}

			setConversations(prev => prev.map(c => (c.uuid === conversation.uuid ? convo : c)))
			setSelectedConversation(prev => (prev ? (prev.uuid === conversation.uuid ? convo : prev) : prev))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [conversation, loadingToast, errorToast, setSelectedConversation, setConversations, hasAddPermissions])

	return (
		<div
			className={cn(
				"w-full h-12 flex flex-row px-4 border-b shadow-sm items-center gap-2 justify-between shrink-0 z-[10001] select-none",
				dark ? "bg-[#151518]" : "bg-[#FBFBFB]"
			)}
		>
			<div
				className={cn("flex flex-row gap-2 items-center", hasWritePermissions ? "cursor-pointer" : "cursor-default")}
				onClick={editConversationName}
			>
				<ChatAvatar
					size={24}
					participants={conversation.participants}
					className="shrink-0"
				/>
				<p className="line-clamp-1 text-ellipsis break-all">{getConversationName(conversation, userId)}</p>
			</div>
			{conversation.participants.length > 2 ? (
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
			) : hasAddPermissions ? (
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-md p-1 cursor-pointer"
								onClick={addParticipant}
							>
								<UserRoundPlus />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>{t("innerSideBar.notes.createNote")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : null}
		</div>
	)
})

export default TopBar
