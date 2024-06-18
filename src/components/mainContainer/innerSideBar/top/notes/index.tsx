import { memo, useCallback, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import worker from "@/lib/worker"
import { useNotesStore } from "@/stores/notes.store"
import Input from "@/components/input"
import Tags from "./tags"
import { type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { useLocalStorage } from "@uidotdev/usehooks"
import eventEmitter from "@/lib/eventEmitter"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"

export const Notes = memo(() => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { setNotes, search, setSearch, setSelectedNote } = useNotesStore()
	const [defaultNoteType] = useLocalStorage<NoteType>("defaultNoteType", "text")
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const createNote = useCallback(async () => {
		const toast = loadingToast()

		try {
			const { uuid } = await worker.createNote()

			if (defaultNoteType !== "text") {
				await worker.changeNoteType({ uuid, type: defaultNoteType })
			}

			const notes = await worker.listNotes()

			setNotes(notes)

			const newNote = notes.filter(n => n.uuid === uuid)

			if (newNote.length === 0 || !newNote[0]) {
				return
			}

			setSelectedNote(newNote[0])

			navigate({
				to: "/notes/$uuid",
				params: {
					uuid
				}
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [navigate, setNotes, setSelectedNote, defaultNoteType, loadingToast, errorToast])

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value)
		},
		[setSearch]
	)

	const clearSearch = useCallback(() => {
		setSearch("")
	}, [setSearch])

	useEffect(() => {
		const createNoteListener = eventEmitter.on("createNote", createNote)

		return () => {
			createNoteListener.remove()
		}
	}, [createNote])

	return (
		<div
			className="h-auto w-full flex flex-col"
			id="inner-sidebar-top-notes"
		>
			<div className="h-12 w-full flex flex-row items-center px-4 justify-between">
				<p>{t("innerSideBar.top.notes")}</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-md p-1 cursor-pointer"
								onClick={createNote}
							>
								<Plus />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>{t("innerSideBar.notes.createNote")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex flex-row w-full h-auto px-4">
				<Input
					placeholder={t("innerSideBar.notes.search")}
					value={search}
					onChange={onChange}
					withSearchIcon={true}
					withClearIcon={true}
					onClear={clearSearch}
					autoCapitalize="none"
					autoComplete="none"
					autoCorrect="none"
				/>
			</div>
			<Tags />
		</div>
	)
})

export default Notes
