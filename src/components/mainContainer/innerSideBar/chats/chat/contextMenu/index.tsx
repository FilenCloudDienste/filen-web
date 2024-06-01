import { memo, useMemo, useCallback, useEffect } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useTranslation } from "react-i18next"
import useSDKConfig from "@/hooks/useSDKConfig"
import { Text, Copy, Delete } from "lucide-react"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useChatsStore } from "@/stores/chats.store"
import { showInputDialog } from "@/components/dialogs/input"
import useSuccessToast from "@/hooks/useSuccessToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { useNavigate } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import eventEmitter from "@/lib/eventEmitter"

const iconSize = 16

export const ContextMenu = memo(({ conversation, children }: { conversation: ChatConversation; children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { userId } = useSDKConfig()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { setConversations, setSelectedConversation } = useChatsStore()
	const successToast = useSuccessToast()
	const navigate = useNavigate()
	const routeParent = useRouteParent()

	const hasWritePermissions = useMemo((): boolean => {
		return conversation.ownerId === userId
	}, [conversation.ownerId, userId])

	const editName = useCallback(async () => {
		const inputResponse = await showInputDialog({
			title: t("chats.dialogs.editName.title"),
			continueButtonText: t("chats.dialogs.editName.continue"),
			value: conversation.name ? conversation.name : "",
			autoFocusInput: true,
			placeholder: t("chats.dialogs.editName.placeholder")
		})

		if (inputResponse.cancelled || inputResponse.value.trim().length === 0) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.chatEditConversationName({ conversation: conversation.uuid, name: inputResponse.value.trim() })

			setConversations(prev => prev.map(c => (c.uuid === conversation.uuid ? { ...c, name: inputResponse.value.trim() } : c)))
			setSelectedConversation(prev =>
				prev ? (prev.uuid === conversation.uuid ? { ...prev, name: inputResponse.value.trim() } : prev) : prev
			)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [conversation.uuid, errorToast, loadingToast, setConversations, setSelectedConversation, conversation.name, t])

	const copyId = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(conversation.uuid)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [conversation.uuid, successToast, errorToast, t])

	const deleteConversation = useCallback(async () => {
		if (
			!hasWritePermissions ||
			!(await showConfirmDialog({
				title: t("chats.dialogs.deleteConversation.title"),
				continueButtonText: t("chats.dialogs.deleteConversation.continue"),
				description: t("chats.dialogs.deleteConversation.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.deleteChatConversation({ conversation: conversation.uuid })

			eventEmitter.emit("refetchChats")

			setConversations(prev => prev.filter(c => c.uuid !== conversation.uuid))
			setSelectedConversation(prev => (prev ? (prev.uuid === conversation.uuid ? null : prev) : prev))

			if (conversation.uuid === routeParent) {
				navigate({
					to: "/chats"
				})
			}
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
		hasWritePermissions,
		routeParent,
		navigate,
		t
	])

	const leave = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: t("chats.dialogs.leaveConversation.title"),
				continueButtonText: t("chats.dialogs.leaveConversation.continue"),
				description: t("chats.dialogs.leaveConversation.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.leaveChatConversation({ conversation: conversation.uuid })

			eventEmitter.emit("refetchChats")

			setConversations(prev => prev.filter(c => c.uuid !== conversation.uuid))
			setSelectedConversation(prev => (prev ? (prev.uuid === conversation.uuid ? null : prev) : prev))

			if (conversation.uuid === routeParent) {
				navigate({
					to: "/chats"
				})
			}
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [conversation.uuid, errorToast, loadingToast, setConversations, setSelectedConversation, routeParent, navigate, t])

	useEffect(() => {
		const editConversationNameListener = eventEmitter.on("editConversationName", conversationUUID => {
			if (conversationUUID !== conversation.uuid) {
				return
			}

			editName()
		})

		return () => {
			editConversationNameListener.remove()
		}
	}, [conversation.uuid, editName])

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-48">
				{hasWritePermissions && (
					<>
						<ContextMenuItem
							onClick={editName}
							className="cursor-pointer gap-3"
						>
							<Text size={iconSize} />
							{t("contextMenus.chats.editName")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{conversation.ownerId !== userId ? (
					<>
						<ContextMenuItem
							onClick={leave}
							className="cursor-pointer gap-3 text-red-500"
						>
							<Delete size={iconSize} />
							{t("contextMenus.chats.leave")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				) : (
					<>
						<ContextMenuItem
							onClick={deleteConversation}
							className="cursor-pointer gap-3 text-red-500"
						>
							<Delete size={iconSize} />
							{t("contextMenus.chats.delete")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				<ContextMenuItem
					onClick={copyId}
					className="cursor-pointer gap-3"
				>
					<Copy size={iconSize} />
					{t("contextMenus.chats.copyId")}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
