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
			title: "name",
			continueButtonText: "edit",
			value: conversation.name ? conversation.name : "",
			autoFocusInput: true,
			placeholder: "Name"
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

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [conversation.uuid, errorToast, loadingToast, setConversations, setSelectedConversation, conversation.name])

	const copyId = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(conversation.uuid)

			const toast = successToast("Copied to clipboard")

			toast.update({
				id: toast.id,
				duration: 3000
			})
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		}
	}, [conversation.uuid, successToast, errorToast])

	const deleteConversation = useCallback(async () => {
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
			await worker.deleteChatConversation({ conversation: conversation.uuid })

			setConversations(prev => prev.filter(c => c.uuid !== conversation.uuid))
			setSelectedConversation(prev => (prev ? (prev.uuid === conversation.uuid ? null : prev) : prev))

			if (conversation.uuid === routeParent) {
				navigate({
					to: "/notes"
				})
			}
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
	}, [conversation.uuid, errorToast, loadingToast, setConversations, setSelectedConversation, hasWritePermissions, routeParent, navigate])

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
			<ContextMenuContent className="min-w-52">
				{hasWritePermissions && (
					<>
						<ContextMenuItem
							onClick={editName}
							className="cursor-pointer gap-3"
						>
							<Text size={iconSize} />
							{t("chats.message.edit")}
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem
							onClick={deleteConversation}
							className="cursor-pointer gap-3 text-red-500"
						>
							<Delete size={iconSize} />
							{t("chats.message.delete")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				<ContextMenuItem
					onClick={copyId}
					className="cursor-pointer gap-3"
				>
					<Copy size={iconSize} />
					{t("chats.message.copyId")}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
