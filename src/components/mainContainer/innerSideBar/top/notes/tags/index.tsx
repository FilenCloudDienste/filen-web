import { memo, useCallback, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Heart, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { showInputDialog } from "@/components/dialogs/input"
import { useNotesStore } from "@/stores/notes.store"
import { cn } from "@/lib/utils"
import ContextMenu from "./contextMenu"
import eventEmitter from "@/lib/eventEmitter"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"

export const tagClassName =
	"flex flex-row gap-1 items-center justify-center px-2 py-1 rounded-md bg-muted/35 text-muted-foreground hover:bg-secondary hover:text-primary cursor-pointer h-7 text-sm"

export const Tags = memo(() => {
	const { t } = useTranslation()
	const { activeTag, setActiveTag, setNotes, setSelectedNote } = useNotesStore(
		useCallback(
			state => ({
				activeTag: state.activeTag,
				setActiveTag: state.setActiveTag,
				setNotes: state.setNotes,
				setSelectedNote: state.setSelectedNote
			}),
			[]
		)
	)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const query = useQuery({
		queryKey: ["listNotesTags"],
		queryFn: () => worker.listNotesTags()
	})

	const createTag = useCallback(
		async (applyToNoteUUID?: string) => {
			const inputResponse = await showInputDialog({
				title: t("notes.dialogs.createTag.title"),
				continueButtonText: t("notes.dialogs.createTag.continue"),
				value: "",
				autoFocusInput: true,
				placeholder: t("notes.dialogs.createTag.placeholder"),
				continueButtonVariant: "default"
			})

			if (
				inputResponse.cancelled ||
				inputResponse.value.trim().length === 0 ||
				["all", "favorites", "pinned"].includes(inputResponse.value.toLowerCase().trim())
			) {
				return
			}

			const toast = loadingToast()

			try {
				const tagUUID = await worker.createNotesTag({ name: inputResponse.value.trim() })

				await query.refetch()

				if (typeof applyToNoteUUID === "string" && applyToNoteUUID.length > 0) {
					await worker.tagNote({
						uuid: applyToNoteUUID,
						tag: tagUUID
					})

					const tag: NoteTag = {
						uuid: tagUUID,
						name: inputResponse.value.trim(),
						favorite: false,
						editedTimestamp: 0,
						createdTimestamp: Date.now()
					}

					setNotes(prev =>
						prev.map(prevNote =>
							prevNote.uuid === applyToNoteUUID
								? {
										...prevNote,
										tags: [...prevNote.tags, tag]
									}
								: prevNote
						)
					)

					setSelectedNote(prev =>
						prev && prev.uuid === applyToNoteUUID
							? {
									...prev,
									tags: [...prev.tags, tag]
								}
							: prev
					)
				}
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[query, t, errorToast, loadingToast, setNotes, setSelectedNote]
	)

	useEffect(() => {
		const createNotesTagListener = eventEmitter.on("createNotesTag", createTag)

		return () => {
			createNotesTagListener.remove()
		}
	}, [createTag])

	return (
		<div className="flex flex-row w-full h-auto p-4 flex-wrap gap-2">
			<div
				className={cn(tagClassName, activeTag === "all" && "bg-secondary text-primary")}
				onClick={() => setActiveTag("all")}
			>
				{t("innerSideBar.notes.tags.all")}
			</div>
			<div
				className={cn(tagClassName, activeTag === "favorites" && "bg-secondary text-primary")}
				onClick={() => setActiveTag("favorites")}
			>
				{t("innerSideBar.notes.tags.favorites")}
			</div>
			<div
				className={cn(tagClassName, activeTag === "pinned" && "bg-secondary text-primary")}
				onClick={() => setActiveTag("pinned")}
			>
				{t("innerSideBar.notes.tags.pinned")}
			</div>
			{query.isSuccess &&
				query.data.map(tag => {
					return (
						<ContextMenu
							tag={tag}
							key={tag.uuid}
							refetch={query.refetch}
						>
							<div
								className={cn(tagClassName, activeTag === tag.uuid && "bg-secondary text-primary")}
								onClick={() => setActiveTag(tag.uuid)}
							>
								{tag.favorite && <Heart size={14} />}
								<p className="line-clamp-1 break-all text-ellipsis">{tag.name}</p>
							</div>
						</ContextMenu>
					)
				})}
			<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<div
							className={tagClassName}
							onClick={() => createTag()}
						>
							<Plus size={18} />
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>{t("innerSideBar.notes.createTag")}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
})

export default Tags
