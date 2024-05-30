import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { useNotesStore } from "@/stores/notes.store"
import TextEditor from "@/components/textEditor"
import useWindowSize from "@/hooks/useWindowSize"
import useResizablePanelSizes from "@/hooks/useResizablePanelSizes"
import { fileNameToPreviewType } from "@/components/dialogs/previewDialog/utils"
import RichTextEditor from "@/components/textEditor/rich"
import useRouteParent from "@/hooks/useRouteParent"
import { normalizeChecklistValue } from "../utils"
import { type SocketEvent } from "@filen/sdk"
import socket from "@/lib/socket"
import { useNavigate } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import { IS_DESKTOP } from "@/constants"

export const Content = memo(({ note }: { note: Note }) => {
	const { setSelectedNote, setNotes, setSynced } = useNotesStore()
	const windowSize = useWindowSize()
	const resizablePanelSizes = useResizablePanelSizes()
	const [value, setValue] = useState<string>("")
	const editContentTimeout = useRef<ReturnType<typeof setTimeout>>()
	const parent = useRouteParent()
	const lastNoteUUIDRef = useRef<string>("")
	const initialValueRef = useRef<string>("")
	const queryUpdatedAtRef = useRef<number>(-1)
	const navigate = useNavigate()
	const { userId } = useSDKConfig()

	const query = useQuery({
		queryKey: ["fetchNoteContent", note.uuid],
		queryFn: () => worker.fetchNoteContent({ uuid: note.uuid })
	})

	const editorType = useMemo(() => {
		return fileNameToPreviewType(note.title)
	}, [note.title])

	const editContent = useCallback(
		async (val: string) => {
			if (parent !== note.uuid || JSON.stringify(initialValueRef.current) === JSON.stringify(val)) {
				setSynced(true)

				return
			}

			try {
				await worker.editNoteContent({ uuid: note.uuid, type: note.type, content: val })

				initialValueRef.current = val

				setSynced(true)
				setSelectedNote(prev => (prev ? { ...prev, editedTimestamp: Date.now() } : prev))
				setNotes(prev =>
					prev.map(prevNote => (prevNote.uuid === note.uuid ? { ...prevNote, editedTimestamp: Date.now() } : prevNote))
				)
			} catch (e) {
				console.error(e)
			}
		},
		[parent, note.uuid, setSelectedNote, setNotes, note.type, setSynced]
	)

	const editContentDebounce = useCallback(
		(val: string) => {
			clearTimeout(editContentTimeout.current)

			editContentTimeout.current = setTimeout(() => editContent(val), 3000)
		},
		[editContent]
	)

	const onValueChange = useCallback(
		(val: string) => {
			if (parent === note.uuid && JSON.stringify(initialValueRef.current) !== JSON.stringify(val)) {
				setSynced(false)
				editContentDebounce(val)
			}
		},
		[editContentDebounce, note.uuid, parent, setSynced]
	)

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (event.type === "noteContentEdited") {
					if (event.data.note !== note.uuid || event.data.editorId === userId) {
						return
					}

					await query.refetch()
				} else if (event.type === "noteDeleted") {
					if (parent === event.data.note) {
						navigate({
							to: "/notes"
						})
					}
				}
			} catch (e) {
				console.error(e)
			}
		},
		[query, parent, navigate, userId, note.uuid]
	)

	const keyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "s" && (e.ctrlKey || e.metaKey) && value.length > 0) {
				e.preventDefault()
				e.stopPropagation()

				editContent(value)

				return
			}
		},
		[editContent, value]
	)

	useEffect(() => {
		if (query.isSuccess && queryUpdatedAtRef.current !== query.dataUpdatedAt) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			const content = note.type === "checklist" ? normalizeChecklistValue(query.data.content) : query.data.content

			if (JSON.stringify(initialValueRef.current) !== JSON.stringify(content)) {
				setValue(content)

				initialValueRef.current = content

				setSynced(true)
			}
		}
	}, [query.isSuccess, query.data, note.type, setSynced, query.dataUpdatedAt])

	useEffect(() => {
		if (lastNoteUUIDRef.current !== note.uuid) {
			lastNoteUUIDRef.current = note.uuid

			clearTimeout(editContentTimeout.current)

			query.refetch().catch(console.error)
		}
	}, [note.uuid, query])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)
		window.addEventListener("keydown", keyDownListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
			window.removeEventListener("keydown", keyDownListener)
		}
	}, [socketEventListener, keyDownListener])

	if (!query.isSuccess) {
		return null
	}

	if (note.type === "checklist" || note.type === "rich") {
		return (
			<RichTextEditor
				key={`${note.uuid}-${note.type}`}
				value={value}
				setValue={setValue}
				onValueChange={onValueChange}
				width={resizablePanelSizes.right.width}
				height={windowSize.height - 48 - (IS_DESKTOP ? 24 : 0)}
				type={note.type}
				placeholder="Note content..."
			/>
		)
	}

	return (
		<TextEditor
			key={`${note.uuid}-${note.type}`}
			fileName={note.type === "md" || editorType === "md" ? "note.md" : note.title}
			value={value}
			setValue={setValue}
			onValueChange={onValueChange}
			height={windowSize.height - 48 - (IS_DESKTOP ? 24 : 0)}
			type={editorType === "code" || editorType === "md" || note.type === "md" || note.type === "code" ? "code" : "text"}
			placeholder="Note content..."
			showMarkdownPreview={note.type === "md"}
		/>
	)
})

export default Content
