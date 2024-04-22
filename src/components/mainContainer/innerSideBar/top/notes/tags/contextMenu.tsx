import { memo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import worker from "@/lib/worker"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showInputDialog } from "@/components/dialogs/input"
import { type RefetchOptions, type QueryObserverResult } from "@tanstack/react-query"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

export const ContextMenu = memo(
	({
		tag,
		children,
		refetch
	}: {
		tag: NoteTag
		children: React.ReactNode
		refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<NoteTag[], Error>>
	}) => {
		const { t } = useTranslation()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()

		const deleteTag = useCallback(async () => {
			if (
				!(await showConfirmDialog({
					title: "delete",
					continueButtonText: "delete",
					continueButtonVariant: "destructive",
					description: "delele"
				}))
			) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.deleteNotesTag({ uuid: tag.uuid })
				await refetch()
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
		}, [tag.uuid, refetch, loadingToast, errorToast])

		const favorite = useCallback(async () => {
			const toast = loadingToast()

			try {
				await worker.favoriteNotesTag({
					uuid: tag.uuid,
					favorite: true
				})
				await refetch()
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
		}, [tag.uuid, refetch, loadingToast, errorToast])

		const unfavorite = useCallback(async () => {
			const toast = loadingToast()

			try {
				await worker.favoriteNotesTag({
					uuid: tag.uuid,
					favorite: false
				})

				await refetch()
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
		}, [tag.uuid, refetch, loadingToast, errorToast])

		const rename = useCallback(async () => {
			const inputResponse = await showInputDialog({
				title: "rename",
				continueButtonText: "rename",
				value: "",
				autoFocusInput: true,
				placeholder: "rename"
			})

			if (inputResponse.cancelled) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.renameNotesTag({
					uuid: tag.uuid,
					name: inputResponse.value.trim()
				})

				await refetch()
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
		}, [tag.uuid, refetch, loadingToast, errorToast])

		return (
			<CM>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-52">
					{tag.favorite ? (
						<ContextMenuItem
							onClick={unfavorite}
							className="cursor-pointer"
						>
							{t("contextMenus.notes.unfavorite")}
						</ContextMenuItem>
					) : (
						<ContextMenuItem
							onClick={favorite}
							className="cursor-pointer"
						>
							{t("contextMenus.notes.favorite")}
						</ContextMenuItem>
					)}
					<ContextMenuItem
						onClick={rename}
						className="cursor-pointer"
					>
						{t("contextMenus.notes.rename")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={deleteTag}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.notes.delete")}
					</ContextMenuItem>
				</ContextMenuContent>
			</CM>
		)
	}
)

export default ContextMenu
