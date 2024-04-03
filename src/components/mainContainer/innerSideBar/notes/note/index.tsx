import { memo, type SetStateAction, useCallback } from "react"
import { cn } from "@/lib/utils"
import useRouteParent from "@/hooks/useRouteParent"
import { Link } from "@tanstack/react-router"
import Icon from "@/components/icon"
import { type Note as NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import ContextMenu from "./contextMenu"
import { simpleDate } from "@/utils"

export const Note = memo(
	({
		note,
		setLastSelectedNote,
		setSelectedNote
	}: {
		note: NoteType
		setLastSelectedNote: (value: SetStateAction<string>) => void
		setSelectedNote: (fn: NoteType | ((prev: NoteType | null) => NoteType | null) | null) => void
	}) => {
		const routeParent = useRouteParent()

		const select = useCallback(() => {
			setLastSelectedNote(note.uuid)
			setSelectedNote(note)
		}, [setSelectedNote, note, setLastSelectedNote])

		return (
			<ContextMenu note={note}>
				<Link
					className={cn(
						"flex flex-row gap-4 p-4 border-l-[3px] hover:bg-primary-foreground",
						routeParent === note.uuid ? "border-l-blue-500 bg-primary-foreground" : "border-transparent"
					)}
					to="/notes/$uuid"
					params={{
						uuid: note.uuid
					}}
					onClick={select}
				>
					<div className="flex flex-col">
						{note.archive ? (
							<Icon
								name="archive"
								className="text-yellow-500"
							/>
						) : note.trash ? (
							<Icon
								name="trash"
								className="text-red-500"
							/>
						) : (
							<>
								{note.type === "checklist" && (
									<Icon
										name="list-checks"
										className="text-purple-500"
									/>
								)}
								{note.type === "text" && (
									<Icon
										name="text"
										className="text-blue-500"
									/>
								)}
								{note.type === "code" && (
									<Icon
										name="code"
										className="text-red-500"
									/>
								)}
								{note.type === "rich" && (
									<Icon
										name="notepad-text"
										className="text-cyan-500"
									/>
								)}
								{note.type === "md" && (
									<Icon
										name="book-marked"
										className="text-indigo-500"
									/>
								)}
							</>
						)}
					</div>
					<div className="flex flex-col grow">
						<p className="line-clamp-1 text-ellipsis break-all">{note.title}</p>
						<p className="line-clamp-1 text-ellipsis text-muted-foreground text-sm mt-1 break-all">
							{note.preview ? note.preview : note.title}
						</p>
						<p className="line-clamp-1 text-ellipsis text-muted-foreground text-sm mt-1 break-all">
							{simpleDate(note.editedTimestamp)}
						</p>
					</div>
				</Link>
			</ContextMenu>
		)
	}
)

export default Note
