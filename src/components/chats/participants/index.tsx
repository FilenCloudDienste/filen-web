import { memo, useRef, useCallback, useMemo } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { Plus } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { useVirtualizer } from "@tanstack/react-virtual"
import useWindowSize from "@/hooks/useWindowSize"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import Participant from "./participant"
import { selectContacts } from "@/components/dialogs/selectContacts"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useChatsStore } from "@/stores/chats.store"
import eventEmitter from "@/lib/eventEmitter"
import useSDKConfig from "@/hooks/useSDKConfig"

export const Participants = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { t } = useTranslation()
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()
	const { setConversations, setSelectedConversation } = useChatsStore()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { userId } = useSDKConfig()

	const onlineQuery = useQuery({
		queryKey: ["chatConversationOnline", conversation.uuid],
		queryFn: () => worker.chatConversationOnline({ conversation: conversation.uuid }),
		refetchInterval: 15000,
		refetchIntervalInBackground: true
	})

	const rowVirtualizer = useVirtualizer({
		count: conversation.participants.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 56,
		getItemKey(index) {
			return conversation.participants[index].userId
		},
		overscan: 5
	})

	const hasWritePermissions = useMemo(() => {
		if (userId === conversation.ownerId) {
			return true
		}

		const found = conversation.participants.filter(p => p.userId === userId)

		if (found.length === 0) {
			return false
		}

		return found[0].permissionsAdd
	}, [userId, conversation.participants, conversation.ownerId])

	const addParticipant = useCallback(async () => {
		if (!hasWritePermissions) {
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

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [conversation, loadingToast, errorToast, setSelectedConversation, setConversations, hasWritePermissions])

	if (!onlineQuery.isSuccess) {
		return null
	}

	return (
		<div className="w-full h-full flex flex-col">
			<div className="w-full h-12 flex flex-row items-center justify-between px-4">
				<p className="line-clamp-1 text-ellipsis break-all">Participants</p>
				{hasWritePermissions && (
					<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
						<Tooltip>
							<TooltipTrigger asChild={true}>
								<div
									className="hover:bg-secondary rounded-md p-1 cursor-pointer"
									onClick={addParticipant}
								>
									<Plus />
								</div>
							</TooltipTrigger>
							<TooltipContent side="left">
								<p>{t("innerSideBar.notes.createNote")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>
			<div className="flex flex-col w-full h-auto">
				<div
					ref={virtualizerParentRef}
					style={{
						height: windowSize.height - 48,
						overflowX: "hidden",
						overflowY: "auto"
					}}
				>
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative"
						}}
					>
						{rowVirtualizer.getVirtualItems().map(virtualItem => {
							const participant = conversation.participants[virtualItem.index]

							return (
								<div
									key={virtualItem.key}
									data-index={virtualItem.index}
									ref={rowVirtualizer.measureElement}
								>
									<Participant
										conversation={conversation}
										onlineUsers={onlineQuery.data}
										participant={participant}
									/>
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
})

export default Participants
