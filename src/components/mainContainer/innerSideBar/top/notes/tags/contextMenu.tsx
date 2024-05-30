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
import { Delete, Heart, Edit } from "lucide-react"

const iconSize = 16

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
					title: t("notes.dialogs.deleteTag.title"),
					continueButtonText: t("notes.dialogs.deleteTag.continue"),
					description: t("notes.dialogs.deleteTag.description", {
						name: tag.name
					}),
					continueButtonVariant: "destructive"
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [tag.uuid, refetch, loadingToast, errorToast, t, tag.name])

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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [tag.uuid, refetch, loadingToast, errorToast])

		const rename = useCallback(async () => {
			const inputResponse = await showInputDialog({
				title: t("notes.dialogs.renameTag.title"),
				continueButtonText: t("notes.dialogs.renameTag.continue"),
				value: tag.name,
				autoFocusInput: true,
				placeholder: t("notes.dialogs.renameTag.placeholder"),
				continueButtonVariant: "default"
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [tag.uuid, refetch, loadingToast, errorToast, t, tag.name])

		return (
			<CM>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					{tag.favorite ? (
						<ContextMenuItem
							onClick={unfavorite}
							className="cursor-pointer gap-3"
						>
							<Heart size={iconSize} />
							{t("contextMenus.notes.unfavorite")}
						</ContextMenuItem>
					) : (
						<ContextMenuItem
							onClick={favorite}
							className="cursor-pointer gap-3"
						>
							<Heart size={iconSize} />
							{t("contextMenus.notes.favorite")}
						</ContextMenuItem>
					)}
					<ContextMenuItem
						onClick={rename}
						className="cursor-pointer gap-3"
					>
						<Edit size={iconSize} />
						{t("contextMenus.notes.rename")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={deleteTag}
						className="cursor-pointer text-red-500 gap-3"
					>
						<Delete size={iconSize} />
						{t("contextMenus.notes.delete")}
					</ContextMenuItem>
				</ContextMenuContent>
			</CM>
		)
	}
)

export default ContextMenu
