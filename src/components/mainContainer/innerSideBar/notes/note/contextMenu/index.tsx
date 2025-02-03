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
import { cn, sanitizeFileName } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { getStreamWriter } from "@/lib/streamSaver"
import striptags from "striptags"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { ZipWriter } from "@zip.js/zip.js"
import eventEmitter from "@/lib/eventEmitter"
import {
	RotateCcw,
	Delete,
	Users2,
	History,
	Heart,
	Pin,
	Copy,
	Download,
	Archive,
	Trash,
	Notebook,
	Text,
	ListChecks,
	Code,
	NotepadText,
	BookMarked,
	Hash,
	Plus
} from "lucide-react"
import useSDKConfig from "@/hooks/useSDKConfig"
import useSuccessToast from "@/hooks/useSuccessToast"

const iconSize = 16

export const ContextMenu = memo(
	({
		note,
		children,
		setHovering
	}: {
		note: Note
		children: React.ReactNode
		setHovering: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const { t } = useTranslation()
		const { setNotes, setSelectedNote, selectedNote, notes } = useNotesStore(
			useCallback(
				state => ({
					setNotes: state.setNotes,
					setSelectedNote: state.setSelectedNote,
					selectedNote: state.selectedNote,
					notes: state.notes
				}),
				[]
			)
		)
		const navigate = useNavigate()
		const errorToast = useErrorToast()
		const loadingToast = useLoadingToast()
		const { userId } = useSDKConfig()
		const successToast = useSuccessToast()

		const tagsQuery = useQuery({
			queryKey: ["listNotesTags"],
			queryFn: () => worker.listNotesTags()
		})

		const onOpenChange = useCallback(
			(open: boolean) => {
				setHovering(open)
			},
			[setHovering]
		)

		const trash = useCallback(async () => {
			const toast = loadingToast()

			try {
				await worker.trashNote({ uuid: note.uuid })

				setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, trash: true } : prevNote)))
				setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, trash: true } : prev))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

		const leave = useCallback(async () => {
			if (
				!(await showConfirmDialog({
					title: t("notes.dialogs.leaveNote.title"),
					continueButtonText: t("notes.dialogs.leaveNote.continue"),
					description: t("notes.dialogs.leaveNote.description", {
						name: note.title
					}),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.removeNoteParticipant({ uuid: note.uuid, userId })

				setNotes(prev => prev.filter(prevNote => prevNote.uuid !== note.uuid))

				if (selectedNote && selectedNote.uuid === note.uuid) {
					const newSelectedNote = notes.filter(n => n.uuid !== note.uuid)

					if (newSelectedNote.length >= 1 && newSelectedNote[0]) {
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast, t, navigate, note.title, notes, selectedNote, userId])

		const deleteNote = useCallback(async () => {
			if (
				!(await showConfirmDialog({
					title: t("notes.dialogs.deleteNote.title"),
					continueButtonText: t("notes.dialogs.deleteNote.continue"),
					description: t("notes.dialogs.deleteNote.description", {
						name: note.title
					}),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.deleteNote({ uuid: note.uuid })

				setNotes(prev => prev.filter(prevNote => prevNote.uuid !== note.uuid))

				if (selectedNote && selectedNote.uuid === note.uuid) {
					const newSelectedNote = notes.filter(n => n.uuid !== note.uuid)

					if (newSelectedNote.length >= 1 && newSelectedNote[0]) {
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [note.uuid, setNotes, setSelectedNote, notes, navigate, selectedNote, errorToast, loadingToast, t, note.title])

		const favorite = useCallback(async () => {
			const toast = loadingToast()

			try {
				await worker.favoriteNote({ uuid: note.uuid, favorite: true })

				setNotes(prev => prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, favorite: true } : prevNote)))
				setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, favorite: true } : prev))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [note.uuid, setNotes, setSelectedNote, loadingToast, errorToast])

		const duplicate = useCallback(async () => {
			const toast = loadingToast()

			try {
				const uuid = await worker.duplicateNote({ uuid: note.uuid })
				const notes = await worker.listNotes()
				const selected = notes.filter(n => n.uuid === uuid)[0]

				setNotes(notes)

				if (selected) {
					setSelectedNote(selected)
				}

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
		}, [note.uuid, setNotes, navigate, setSelectedNote, loadingToast, errorToast])

		const restore = useCallback(async () => {
			const toast = loadingToast()

			try {
				await worker.restoreNote({ uuid: note.uuid })

				setNotes(prev =>
					prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, trash: false, archive: false } : prevNote))
				)
				setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, trash: false, archive: false } : prev))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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
					await worker.tagNote({
						uuid: note.uuid,
						tag: tag.uuid
					})

					setNotes(prev =>
						prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, tags: [...prevNote.tags, tag] } : prevNote))
					)

					setSelectedNote(prev => (prev && prev.uuid === note.uuid ? { ...prev, tags: [...prev.tags, tag] } : prev))
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

						if (listPointEx[0] && listPointEx[0].trim().length > 0) {
							list.push(listPointEx[0].trim())
						}
					}

					content = list.join("\n")
				}

				const writer = await getStreamWriter({
					name: `${sanitizeFileName(note.title)}.txt`,
					size: content.length
				})

				await writer.write(Buffer.from(content, "utf-8"))

				try {
					await writer.close()
				} catch {
					// Noop
				}
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				toast.dismiss()
			}
		}, [note.uuid, note.title, note.type, loadingToast, errorToast])

		const exportAll = useCallback(async () => {
			let toast: ReturnType<typeof loadingToast> | null = null

			try {
				const writer = await getStreamWriter({
					name: "Notes.zip",
					pipe: true
				})
				const zipWriter = new ZipWriter(writer)

				toast = loadingToast()

				const allNotes = await worker.listNotes()

				await Promise.all(
					allNotes.map(
						n =>
							new Promise<void>((resolve, reject) => {
								worker
									.fetchNoteContent({ uuid: n.uuid })
									.then(({ content }) => {
										if (n.type === "rich") {
											content = striptags(content.split("<p><br></p>").join("\n"))
										}

										if (n.type === "checklist") {
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

												if (listPointEx[0] && listPointEx[0].trim().length > 0) {
													list.push(listPointEx[0].trim())
												}
											}

											content = list.join("\n")
										}

										zipWriter
											.add(`${sanitizeFileName(n.title)}.txt`, new Response(content).body!, {
												lastModDate: new Date(),
												lastAccessDate: new Date(),
												creationDate: new Date(),
												useWebWorkers: false
											})
											.then(() => resolve())
											.catch(reject)
									})
									.catch(reject)
							})
					)
				)

				await zipWriter.close()

				try {
					await writer.close()
				} catch {
					// Noop
				}
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				if (toast) {
					toast.dismiss()
				}
			}
		}, [loadingToast, errorToast])

		const history = useCallback(() => {
			eventEmitter.emit("openNoteHistoryDialog", note)
		}, [note])

		const participants = useCallback(() => {
			eventEmitter.emit("openNoteParticipantsDialog", note)
		}, [note])

		const copyId = useCallback(async () => {
			try {
				await navigator.clipboard.writeText(note.uuid)

				successToast(t("copiedToClipboard"))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		}, [note.uuid, successToast, errorToast, t])

		const createTag = useCallback(() => {
			eventEmitter.emit("createNotesTag", note.uuid)
		}, [note.uuid])

		return (
			<CM onOpenChange={onOpenChange}>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					<ContextMenuItem
						onClick={history}
						className="cursor-pointer gap-3"
					>
						<History size={iconSize} />
						{t("contextMenus.notes.history")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={participants}
						className="cursor-pointer gap-3"
					>
						<Users2 size={iconSize} />
						{t("contextMenus.notes.participants")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuSub>
						<ContextMenuSubTrigger
							className="cursor-pointer gap-3"
							onClick={e => e.stopPropagation()}
						>
							<Notebook size={iconSize} />
							{t("contextMenus.notes.type")}
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem
								onClick={() => changeType("text")}
								className={cn("cursor-pointer gap-3", note.type === "text" ? "text-blue-500" : "")}
							>
								<Text size={iconSize} />
								{t("contextMenus.notes.types.text")}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => changeType("rich")}
								className={cn("cursor-pointer gap-3", note.type === "rich" ? "text-blue-500" : "")}
							>
								<NotepadText size={iconSize} />
								{t("contextMenus.notes.types.rich")}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => changeType("checklist")}
								className={cn("cursor-pointer gap-3", note.type === "checklist" ? "text-blue-500" : "")}
							>
								<ListChecks size={iconSize} />
								{t("contextMenus.notes.types.checklist")}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => changeType("md")}
								className={cn("cursor-pointer gap-3", note.type === "md" ? "text-blue-500" : "")}
							>
								<BookMarked size={iconSize} />
								{t("contextMenus.notes.types.md")}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => changeType("code")}
								className={cn("cursor-pointer gap-3", note.type === "code" ? "text-blue-500" : "")}
							>
								<Code size={iconSize} />
								{t("contextMenus.notes.types.code")}
							</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>
					<ContextMenuSeparator />
					{note.pinned ? (
						<ContextMenuItem
							onClick={unpin}
							className="cursor-pointer gap-3"
						>
							<Pin size={iconSize} />
							{t("contextMenus.notes.unpin")}
						</ContextMenuItem>
					) : (
						<ContextMenuItem
							onClick={pin}
							className="cursor-pointer gap-3"
						>
							<Pin size={iconSize} />
							{t("contextMenus.notes.pin")}
						</ContextMenuItem>
					)}
					{note.favorite ? (
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
					{tagsQuery.isSuccess && (
						<>
							<ContextMenuSub>
								<ContextMenuSubTrigger
									className="cursor-pointer gap-3"
									onClick={e => e.stopPropagation()}
								>
									<Hash size={iconSize} />
									{t("contextMenus.notes.tags")}
								</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									{tagsQuery.data.map(tag => {
										const includesTag = note.tags.map(t => t.uuid).includes(tag.uuid)

										return (
											<ContextMenuItem
												key={tag.uuid}
												onClick={() => (includesTag ? untagNote(tag) : tagNote(tag))}
												className={cn("cursor-pointer gap-3", includesTag ? "text-blue-500" : "")}
											>
												<Hash size={iconSize} />
												{tag.name}
											</ContextMenuItem>
										)
									})}
									<ContextMenuItem
										onClick={createTag}
										className="gap-3 cursor-pointer"
									>
										<Plus size={iconSize} />
										{t("contextMenus.notes.createTag")}
									</ContextMenuItem>
								</ContextMenuSubContent>
							</ContextMenuSub>
						</>
					)}
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={duplicate}
						className="cursor-pointer gap-3"
					>
						<Copy size={iconSize} />
						{t("contextMenus.notes.duplicate")}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={exportNote}
						className="cursor-pointer gap-3"
					>
						<Download size={iconSize} />
						{t("contextMenus.notes.export")}
					</ContextMenuItem>
					<ContextMenuItem
						onClick={exportAll}
						className="cursor-pointer gap-3"
					>
						<Download size={iconSize} />
						{t("contextMenus.notes.exportAll")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={copyId}
						className="cursor-pointer gap-3"
					>
						<Copy size={iconSize} />
						{t("contextMenus.notes.copyId")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					{!note.trash && !note.archive && note.ownerId === userId && (
						<>
							<ContextMenuItem
								onClick={archive}
								className="cursor-pointer gap-3"
							>
								<Archive size={iconSize} />
								{t("contextMenus.notes.archive")}
							</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					{(note.trash || note.archive) && note.ownerId === userId && (
						<>
							<ContextMenuItem
								onClick={restore}
								className="cursor-pointer gap-3"
							>
								<RotateCcw size={iconSize} />
								{t("contextMenus.notes.restore")}
							</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					{note.ownerId === userId ? (
						<>
							{note.trash ? (
								<ContextMenuItem
									onClick={deleteNote}
									className="cursor-pointer text-red-500 gap-3"
								>
									<Delete size={iconSize} />
									{t("contextMenus.notes.delete")}
								</ContextMenuItem>
							) : (
								<ContextMenuItem
									onClick={trash}
									className="cursor-pointer text-red-500 gap-3"
								>
									<Trash size={iconSize} />
									{t("contextMenus.notes.trash")}
								</ContextMenuItem>
							)}
						</>
					) : (
						<ContextMenuItem
							onClick={leave}
							className="cursor-pointer text-red-500 gap-3"
						>
							<Delete size={iconSize} />
							{t("contextMenus.notes.leave")}
						</ContextMenuItem>
					)}
				</ContextMenuContent>
			</CM>
		)
	}
)

export default ContextMenu
