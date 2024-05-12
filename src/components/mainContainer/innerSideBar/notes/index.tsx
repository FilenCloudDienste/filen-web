import { memo, useRef, useEffect, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Virtuoso } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import { useNotesStore } from "@/stores/notes.store"
import { sortAndFilterNotes } from "@/components/notes/utils"
import { useLocalStorage } from "@uidotdev/usehooks"
import Note from "./note"
import { validate as validateUUID } from "uuid"
import { useNavigate } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import useSDKConfig from "@/hooks/useSDKConfig"
import { type SocketEvent } from "@filen/sdk"
import socket from "@/lib/socket"
import { Note as NoteType } from "@filen/sdk/dist/types/api/v3/notes"

export const Notes = memo(() => {
	const windowSize = useWindowSize()
	const { notes, setNotes, setSelectedNote, selectedNote, search, activeTag } = useNotesStore()
	const [, setLastSelectedNote] = useLocalStorage("lastSelectedNote", "")
	const navigate = useNavigate()
	const routeParent = useRouteParent()
	const queryUpdatedAtRef = useRef<number>(-1)
	const { userId } = useSDKConfig()

	const query = useQuery({
		queryKey: ["listNotes"],
		queryFn: () => worker.listNotes()
	})

	const notesSorted = useMemo(() => {
		return sortAndFilterNotes(notes, search, activeTag)
	}, [notes, search, activeTag])

	const getItemKey = useCallback((_: number, note: NoteType) => note.uuid, [])

	const itemContent = useCallback(
		(_: number, note: NoteType) => {
			return (
				<Note
					note={note}
					setLastSelectedNote={setLastSelectedNote}
					setSelectedNote={setSelectedNote}
					userId={userId}
				/>
			)
		},
		[setLastSelectedNote, setSelectedNote, userId]
	)

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (
					event.type === "noteNew" ||
					event.type === "noteArchived" ||
					event.type === "noteParticipantNew" ||
					event.type === "noteParticipantPermissions" ||
					event.type === "noteParticipantRemoved" ||
					event.type === "noteTitleEdited" ||
					event.type === "noteRestored" ||
					event.type === "noteContentEdited"
				) {
					await query.refetch()
				} else if (event.type === "noteDeleted") {
					if (routeParent === event.data.note) {
						navigate({
							to: "/notes"
						})
					}

					await query.refetch()
				}
			} catch (e) {
				console.error(e)
			}
		},
		[query, routeParent, navigate]
	)

	useEffect(() => {
		if (notesSorted.length > 0) {
			if (!validateUUID(routeParent)) {
				setLastSelectedNote(notesSorted[0].uuid)
				setSelectedNote(notesSorted[0])

				navigate({
					to: "/notes/$uuid",
					params: {
						uuid: notesSorted[0].uuid
					}
				})
			} else {
				if (!selectedNote) {
					const foundNote = notesSorted.filter(note => note.uuid === routeParent)

					if (foundNote.length === 1) {
						setLastSelectedNote(foundNote[0].uuid)
						setSelectedNote(foundNote[0])
					}
				}
			}
		}
	}, [navigate, routeParent, notesSorted, setLastSelectedNote, setSelectedNote, selectedNote])

	useEffect(() => {
		if (query.isSuccess && query.dataUpdatedAt !== queryUpdatedAtRef.current) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			setNotes(query.data)
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, setNotes])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	return (
		<Virtuoso
			data={notesSorted}
			totalCount={notesSorted.length}
			height={windowSize.height - 95}
			width="100%"
			computeItemKey={getItemKey}
			defaultItemHeight={104}
			itemContent={itemContent}
			style={{
				overflowX: "hidden",
				overflowY: "auto",
				height: windowSize.height - 95 + "px",
				width: "100%"
			}}
		/>
	)
})

export default Notes
