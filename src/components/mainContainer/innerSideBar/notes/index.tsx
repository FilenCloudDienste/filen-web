import { memo, useRef, useEffect, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { useVirtualizer } from "@tanstack/react-virtual"
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

export const Notes = memo(() => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
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

	const rowVirtualizer = useVirtualizer({
		count: notesSorted.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 104,
		getItemKey(index) {
			return notesSorted[index].uuid
		},
		overscan: 5
	})

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
		<div
			ref={virtualizerParentRef}
			style={{
				height: windowSize.height - 95,
				overflowX: "hidden",
				overflowY: "auto"
			}}
		>
			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative"
				}}
			>
				{rowVirtualizer.getVirtualItems().map(virtualItem => {
					const note = notesSorted[virtualItem.index]

					return (
						<div
							key={virtualItem.key}
							data-index={virtualItem.index}
							ref={rowVirtualizer.measureElement}
						>
							<Note
								note={note}
								setLastSelectedNote={setLastSelectedNote}
								setSelectedNote={setSelectedNote}
								userId={userId}
							/>
						</div>
					)
				})}
			</div>
		</div>
	)
})

export default Notes
