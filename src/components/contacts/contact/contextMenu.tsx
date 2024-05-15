import { memo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { User2, Delete, XCircle } from "lucide-react"
import eventEmitter from "@/lib/eventEmitter"
import worker from "@/lib/worker"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

const iconSize = 16

export const ContextMenu = memo(
	({
		children,
		contact,
		setHovering,
		refetch
	}: {
		children: React.ReactNode
		contact: Contact
		setHovering: React.Dispatch<React.SetStateAction<boolean>>
		refetch: () => Promise<void>
	}) => {
		const { t } = useTranslation()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()

		const profile = useCallback(() => {
			eventEmitter.emit("openProfileDialog", contact.userId)
		}, [contact.userId])

		const remove = useCallback(async () => {
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

			const toast = loadingToast()

			try {
				await worker.removeContact({ uuid: contact.uuid })
				await refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		}, [contact.uuid, errorToast, loadingToast, refetch])

		const block = useCallback(async () => {
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

			const toast = loadingToast()

			try {
				await worker.blockUser({ email: contact.email })
				await refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		}, [contact.email, errorToast, loadingToast, refetch])

		return (
			<CM onOpenChange={setHovering}>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-52">
					<ContextMenuItem
						onClick={profile}
						className="cursor-pointer gap-3"
					>
						<User2 size={iconSize} />
						{t("contextMenus.contacts.profile")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={block}
						className="cursor-pointer gap-3 text-red-500"
					>
						<XCircle size={iconSize} />
						{t("contextMenus.contacts.block")}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={remove}
						className="cursor-pointer gap-3 text-red-500"
					>
						<Delete size={iconSize} />
						{t("contextMenus.contacts.remove")}
					</ContextMenuItem>
				</ContextMenuContent>
			</CM>
		)
	}
)

export default ContextMenu
