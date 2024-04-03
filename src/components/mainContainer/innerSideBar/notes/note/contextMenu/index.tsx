import { memo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import worker from "@/lib/worker"
import { useNotesStore } from "@/stores/notes.store"
import { useNavigate } from "@tanstack/react-router"

export const ContextMenu = memo(({ note, children }: { note: Note; children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { setNotes, setSelectedNote } = useNotesStore()
	const navigate = useNavigate()

	const trash = useCallback(async () => {
		try {
			await worker.trashNote({ uuid: note.uuid })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, trash: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, trash: true } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const deleteNote = useCallback(async () => {
		try {
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

			await worker.deleteNote({ uuid: note.uuid })

			setNotes(prev => prev.filter(prevNote => prevNote.uuid !== note.uuid))
			setSelectedNote(null)
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const favorite = useCallback(async () => {
		try {
			await worker.favoriteNote({ uuid: note.uuid, favorite: true })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, favorite: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, favorite: true } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const unfavorite = useCallback(async () => {
		try {
			await worker.favoriteNote({ uuid: note.uuid, favorite: false })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, favorite: false } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, favorite: false } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const pin = useCallback(async () => {
		try {
			await worker.pinNote({ uuid: note.uuid, pin: true })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, pinned: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, pinned: true } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const unpin = useCallback(async () => {
		try {
			await worker.pinNote({ uuid: note.uuid, pin: false })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, pinned: false } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, pinned: false } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const duplicate = useCallback(async () => {
		try {
			const uuid = await worker.duplicateNote({ uuid: note.uuid })
			const notes = await worker.listNotes()

			setNotes(notes)
			setSelectedNote(notes.filter(n => n.uuid === uuid)[0])

			navigate({
				to: "/notes/$uuid",
				params: {
					uuid
				}
			})
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, navigate, setSelectedNote])

	const restore = useCallback(async () => {
		try {
			await worker.restoreNote({ uuid: note.uuid })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, trash: false, archive: false } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, trash: false, archive: false } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	const archive = useCallback(async () => {
		try {
			await worker.archiveNote({ uuid: note.uuid })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, archive: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, archive: true } : prev))
		} catch (e) {
			console.error(e)
		}
	}, [note.uuid, setNotes, setSelectedNote])

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				<ContextMenuItem
					onClick={() => {}}
					className="cursor-pointer"
				>
					{t("contextMenus.notes.history")}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={() => {}}
					className="cursor-pointer"
				>
					{t("contextMenus.notes.participants")}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={() => {}}
					className="cursor-pointer"
				>
					{t("contextMenus.notes.type")}
				</ContextMenuItem>
				<ContextMenuSeparator />
				{note.pinned ? (
					<ContextMenuItem
						onClick={unpin}
						className="cursor-pointer"
					>
						{t("contextMenus.notes.unpin")}
					</ContextMenuItem>
				) : (
					<ContextMenuItem
						onClick={pin}
						className="cursor-pointer"
					>
						{t("contextMenus.notes.pin")}
					</ContextMenuItem>
				)}
				{note.favorite ? (
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
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={duplicate}
					className="cursor-pointer"
				>
					{t("contextMenus.notes.duplicate")}
				</ContextMenuItem>
				<ContextMenuItem
					onClick={() => {}}
					className="cursor-pointer"
				>
					{t("contextMenus.notes.export")}
				</ContextMenuItem>
				<ContextMenuSeparator />
				{!note.trash && !note.archive && (
					<>
						<ContextMenuItem
							onClick={archive}
							className="cursor-pointer"
						>
							{t("contextMenus.notes.archive")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{(note.trash || note.archive) && (
					<>
						<ContextMenuItem
							onClick={restore}
							className="cursor-pointer"
						>
							{t("contextMenus.notes.restore")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{note.trash ? (
					<ContextMenuItem
						onClick={deleteNote}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.notes.delete")}
					</ContextMenuItem>
				) : (
					<ContextMenuItem
						onClick={trash}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.notes.trash")}
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
