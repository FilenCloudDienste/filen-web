import { memo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger
} from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
import { type Note, type NoteType, type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import worker from "@/lib/worker"
import { useNotesStore } from "@/stores/notes.store"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { showSaveFilePicker } from "native-file-system-adapter"
import striptags from "striptags"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

export const ContextMenu = memo(({ note, children }: { note: Note; children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { setNotes, setSelectedNote, selectedNote, notes } = useNotesStore()
	const navigate = useNavigate()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const tagsQuery = useQuery({
		queryKey: ["listNotesTags"],
		queryFn: () => worker.listNotesTags()
	})

	const trash = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.trashNote({ uuid: note.uuid })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, trash: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, trash: true } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const deleteNote = useCallback(async () => {
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
			await worker.deleteNote({ uuid: note.uuid })

			setNotes(prev => prev.filter(prevNote => prevNote.uuid !== note.uuid))

			if (selectedNote?.uuid === note.uuid) {
				const newSelectedNote = notes.filter(n => n.uuid !== note.uuid)

				if (newSelectedNote.length >= 1) {
					setSelectedNote(newSelectedNote[0])

					navigate({
						to: "/notes/$uuid",
						params: {
							uuid: newSelectedNote[0].uuid
						}
					})
				} else {
					setSelectedNote(null)
				}
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
	}, [note.uuid, setNotes, setSelectedNote, notes, navigate, selectedNote?.uuid, errorToast, loadingToast])

	const favorite = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.favoriteNote({ uuid: note.uuid, favorite: true })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, favorite: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, favorite: true } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const unfavorite = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.favoriteNote({ uuid: note.uuid, favorite: false })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, favorite: false } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, favorite: false } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const pin = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.pinNote({ uuid: note.uuid, pin: true })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, pinned: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, pinned: true } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const unpin = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.pinNote({ uuid: note.uuid, pin: false })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, pinned: false } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, pinned: false } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const duplicate = useCallback(async () => {
		const toast = loadingToast()

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

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [note.uuid, setNotes, navigate, setSelectedNote, loadingToast, errorToast])

	const restore = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.restoreNote({ uuid: note.uuid })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, trash: false, archive: false } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, trash: false, archive: false } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const archive = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.archiveNote({ uuid: note.uuid })

			setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, archive: true } : prevNote)))
			setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, archive: true } : prev))
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
	}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

	const changeType = useCallback(
		async (type: NoteType) => {
			if (note.type === type) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.changeNoteType({ uuid: note.uuid, type })

				setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, type } : prevNote)))
				setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, type } : prev))
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
		[note.uuid, setNotes, setSelectedNote, note.type, loadingToast, errorToast]
	)

	const tagNote = useCallback(
		async (tag: NoteTag) => {
			const toast = loadingToast()

			try {
				await worker.tagNote({ uuid: note.uuid, tag: tag.uuid })

				setNotes(prev =>
					prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, tags: [...prevNote.tags, tag] } : prevNote))
				)
				setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, tags: [...prev.tags, tag] } : prev))
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
		[note.uuid, setNotes, setSelectedNote, loadingToast, errorToast]
	)

	const untagNote = useCallback(
		async (tag: NoteTag) => {
			const toast = loadingToast()

			try {
				await worker.tagNote({ uuid: note.uuid, tag: tag.uuid })

				setNotes(prev =>
					prev.map(prevNote =>
						prevNote.uuid === note.uuid ? { ...prevNote, tags: prevNote.tags.filter(t => t.uuid !== tag.uuid) } : prevNote
					)
				)
				setSelectedNote(prev =>
					prev && prev.uuid === note.uuid ? { ...prev, tags: prev.tags.filter(t => t.uuid !== tag.uuid) } : prev
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
		},
		[note.uuid, setNotes, setSelectedNote, loadingToast, errorToast]
	)

	const exportNote = useCallback(async () => {
		const toast = loadingToast()

		try {
			let { content } = await worker.fetchNoteContent({ uuid: note.uuid })

			if (note.type === "rich") {
				content = striptags(content.split("<p><br></p>").join("\n"))
			}

			if (note.type === "checklist") {
				const list: string[] = []
				const ex = content
					// eslint-disable-next-line quotes
					.split('<ul data-checked="false">')
					.join("")
					// eslint-disable-next-line quotes
					.split('<ul data-checked="true">')
					.join("")
					.split("\n")
					.join("")
					.split("<li>")

				for (const listPoint of ex) {
					const listPointEx = listPoint.split("</li>")

					if (listPointEx[0].trim().length > 0) {
						list.push(listPointEx[0].trim())
					}
				}

				content = list.join("\n")
			}

			const fileHandle = await showSaveFilePicker({
				suggestedName: `${note.title}.txt`
			})

			const writer = await fileHandle.createWritable()

			await writer.write(content)

			writer.close()
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
	}, [note.uuid, note.title, note.type, loadingToast, errorToast])

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
				<ContextMenuSub>
					<ContextMenuSubTrigger
						className="cursor-pointer"
						onClick={e => e.stopPropagation()}
					>
						{t("contextMenus.notes.type")}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuItem
							onClick={() => changeType("text")}
							className={cn("cursor-pointer", note.type === "text" ? "text-blue-500" : "")}
						>
							{t("contextMenus.notes.types.text")}
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() => changeType("rich")}
							className={cn("cursor-pointer", note.type === "rich" ? "text-blue-500" : "")}
						>
							{t("contextMenus.notes.types.rich")}
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() => changeType("checklist")}
							className={cn("cursor-pointer", note.type === "checklist" ? "text-blue-500" : "")}
						>
							{t("contextMenus.notes.types.checklist")}
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() => changeType("md")}
							className={cn("cursor-pointer", note.type === "md" ? "text-blue-500" : "")}
						>
							{t("contextMenus.notes.types.md")}
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() => changeType("code")}
							className={cn("cursor-pointer", note.type === "code" ? "text-blue-500" : "")}
						>
							{t("contextMenus.notes.types.code")}
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
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
				{tagsQuery.isSuccess && (
					<>
						<ContextMenuSub>
							<ContextMenuSubTrigger
								className="cursor-pointer"
								onClick={e => e.stopPropagation()}
							>
								{t("contextMenus.notes.tags")}
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								{tagsQuery.data.map(tag => {
									const includesTag = note.tags.map(t => t.uuid).includes(tag.uuid)

									return (
										<ContextMenuItem
											key={tag.uuid}
											onClick={() => (includesTag ? untagNote(tag) : tagNote(tag))}
											className={cn("cursor-pointer", includesTag ? "text-blue-500" : "")}
										>
											{tag.name}
										</ContextMenuItem>
									)
								})}
							</ContextMenuSubContent>
						</ContextMenuSub>
					</>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={duplicate}
					className="cursor-pointer"
				>
					{t("contextMenus.notes.duplicate")}
				</ContextMenuItem>
				<ContextMenuItem
					onClick={exportNote}
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
