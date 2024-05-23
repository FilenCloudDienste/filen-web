import { memo, useMemo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { type ChatConversationParticipant, type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useChatsStore } from "@/stores/chats.store"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { useTranslation } from "react-i18next"
import useSDKConfig from "@/hooks/useSDKConfig"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import worker from "@/lib/worker"
import { User2, Delete } from "lucide-react"
import eventEmitter from "@/lib/eventEmitter"

const iconSize = 16

export const ContextMenu = memo(
	({
		participant,
		children,
		conversation
	}: {
		participant: ChatConversationParticipant
		children: React.ReactNode
		conversation: ChatConversation
	}) => {
		const { t } = useTranslation()
		const { userId } = useSDKConfig()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const { setConversations, setSelectedConversation } = useChatsStore()

		const hasWritePermissions = useMemo((): boolean => {
			return conversation.ownerId === userId
		}, [conversation.ownerId, userId])

		const remove = useCallback(async () => {
			if (
				!hasWritePermissions ||
				!(await showConfirmDialog({
					title: "d",
					continueButtonText: "ddd",
					description: "ookeoetrasher",
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.chatRemoveParticipant({ conversation: conversation.uuid, userId: participant.userId })

				setConversations(prev =>
					prev.map(c =>
						c.uuid === conversation.uuid
							? { ...c, participants: c.participants.filter(p => p.userId !== participant.userId) }
							: c
					)
				)
				setSelectedConversation(prev =>
					prev
						? prev.uuid === conversation.uuid
							? { ...prev, participants: prev.participants.filter(p => p.userId !== participant.userId) }
							: prev
						: prev
				)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [
			conversation.uuid,
			errorToast,
			loadingToast,
			setConversations,
			setSelectedConversation,
			participant.userId,
			hasWritePermissions
		])

		const profile = useCallback(() => {
			eventEmitter.emit("openProfileDialog", participant.userId)
		}, [participant.userId])

		return (
			<CM>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-52">
					<ContextMenuItem
						onClick={profile}
						className="cursor-pointer gap-3"
					>
						<User2 size={iconSize} />
						{t("chats.message.profile")}
					</ContextMenuItem>
					{hasWritePermissions && userId !== participant.userId && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={remove}
								className="cursor-pointer gap-3 text-red-500"
							>
								<Delete size={iconSize} />
								{t("chats.message.remove")}
							</ContextMenuItem>
						</>
					)}
				</ContextMenuContent>
			</CM>
		)
	}
)

export default ContextMenu
