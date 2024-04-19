import { memo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { Reply, Copy, Text, Delete } from "lucide-react"
import useSDKConfig from "@/hooks/useSDKConfig"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useSuccessToast from "@/hooks/useSuccessToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useChatsStore } from "@/stores/chats.store"
import eventEmitter from "@/lib/eventEmitter"

const iconSize = 16

export const ContextMenu = memo(
	({
		message,
		children,
		setHovering
	}: {
		message: ChatMessage
		children: React.ReactNode
		setHovering: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const { t } = useTranslation()
		const { userId } = useSDKConfig()
		const loadingToast = useLoadingToast()
		const successToast = useSuccessToast()
		const errorToast = useErrorToast()
		const { setMessages, setEditUUID, setReplyMessage } = useChatsStore()

		const onOpenChange = useCallback(
			(open: boolean) => {
				setHovering(open)
			},
			[setHovering]
		)

		const deleteMessage = useCallback(
			async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				if (!e.shiftKey) {
					if (
						!(await showConfirmDialog({
							title: "d",
							continueButtonText: "ddd",
							description: "ookeoetrasher",
							continueButtonVariant: "destructive"
						}))
					) {
						return
					}
				}

				const toast = loadingToast()

				try {
					await worker.chatDeleteMessage({ uuid: message.uuid })

					setMessages(prev => prev.filter(m => m.uuid !== message.uuid))
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
			},
			[message.uuid, loadingToast, errorToast, setMessages]
		)

		const copyText = useCallback(async () => {
			try {
				await navigator.clipboard.writeText(message.message)

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
		}, [message.message, successToast, errorToast])

		const copyId = useCallback(async () => {
			try {
				await navigator.clipboard.writeText(message.uuid)

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
		}, [message.uuid, successToast, errorToast])

		const reply = useCallback(() => {
			setReplyMessage(message)
			setEditUUID("")

			eventEmitter.emit("chatInputFocus")
		}, [message, setReplyMessage, setEditUUID])

		const edit = useCallback(() => {
			setEditUUID(message.uuid)
			setReplyMessage(null)

			eventEmitter.emit("chatInputWriteText", message.message)
		}, [message.uuid, setEditUUID, message.message, setReplyMessage])

		return (
			<CM onOpenChange={onOpenChange}>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-52">
					<ContextMenuItem
						onClick={reply}
						className="cursor-pointer gap-3"
					>
						<Reply size={iconSize} />
						{t("chats.message.reply")}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={copyText}
						className="cursor-pointer gap-3"
					>
						<Copy size={iconSize} />
						{t("chats.message.copyText")}
					</ContextMenuItem>
					{userId === message.senderId && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={edit}
								className="cursor-pointer gap-3"
							>
								<Text size={iconSize} />
								{t("chats.message.edit")}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={deleteMessage}
								className="cursor-pointer gap-3 text-red-500"
							>
								<Delete size={iconSize} />
								{t("chats.message.delete")}
							</ContextMenuItem>
						</>
					)}
					<ContextMenuSeparator />
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
	}
)

export default ContextMenu
