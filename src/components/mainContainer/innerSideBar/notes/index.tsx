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
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from "react-i18next"
import eventEmitter from "@/lib/eventEmitter"

export const Notes = memo(() => {
	const windowSize = useWindowSize()
	const { notes, setNotes, setSelectedNote, selectedNote, search, activeTag } = useNotesStore()
	const [, setLastSelectedNote] = useLocalStorage("lastSelectedNote", "")
	const navigate = useNavigate()
	const routeParent = useRouteParent()
	const queryUpdatedAtRef = useRef<number>(-1)
	const { userId } = useSDKConfig()
	const { t } = useTranslation()

	const query = useQuery({
		queryKey: ["listNotes"],
		queryFn: () => worker.listNotes()
	})

	const showSkeletons = useMemo(() => {
		if (query.isSuccess && query.data.length >= 0) {
			return false
		}

		return true
	}, [query.data, query.isSuccess])

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

	const create = useCallback(() => {
		eventEmitter.emit("createNote")
	}, [])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="flex flex-col w-full h-full overflow-hidden py-3">
						{showSkeletons ? (
							new Array(100).fill(1).map((_, index) => {
								return (
									<div
										key={index}
										className="flex flex-row gap-4 px-4 mb-4"
									>
										<div className="flex flex-row shrink-0">
											<Skeleton className="w-7 h-7 rounded-md shrink-0" />
										</div>
										<div className="flex flex-col grow gap-1">
											<Skeleton className="h-4 w-full grow" />
											<Skeleton className="h-2 w-full grow mt-1" />
											<Skeleton className="h-2 w-full grow" />
										</div>
									</div>
								)
							})
						) : (
							<div className="flex flex-col items-center justify-center p-4 w-full h-full">
								<p className="text-muted-foreground">{t("innerSideBar.notes.empty")}</p>
								<p
									className="text-blue-500 hover:underline cursor-pointer text-sm"
									onClick={create}
								>
									{t("innerSideBar.notes.emptyCreate")}
								</p>
							</div>
						)}
					</div>
				)
			}
		}
	}, [showSkeletons, t, create])

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (
					event.type === "noteNew" ||
					event.type === "noteArchived" ||
					event.type === "noteParticipantNew" ||
					event.type === "noteParticipantPermissions" ||
					event.type === "noteTitleEdited" ||
					event.type === "noteRestored" ||
					event.type === "noteContentEdited"
				) {
					await query.refetch()
				} else if (event.type === "noteParticipantRemoved") {
					if (routeParent === event.data.note && event.data.userId === userId) {
						navigate({
							to: "/notes"
						})
					}

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
		[query, routeParent, navigate, userId]
	)

	useEffect(() => {
		if (notesSorted.length > 0 && notesSorted[0]) {
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

					if (foundNote.length === 1 && foundNote[0]) {
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
			setSelectedNote(prev => {
				if (!prev) {
					return prev
				}

				for (const note of query.data) {
					if (note.uuid === prev.uuid) {
						return note
					}
				}

				return prev
			})
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt, setNotes, setSelectedNote])

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
			itemContent={itemContent}
			components={components}
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
