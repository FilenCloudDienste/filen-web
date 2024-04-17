import { memo, type SetStateAction, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import useRouteParent from "@/hooks/useRouteParent"
import { Link } from "@tanstack/react-router"
import Icon from "@/components/icon"
import { type Note as NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import ContextMenu from "./contextMenu"
import { simpleDate } from "@/utils"
import Avatar from "@/components/avatar"

export const Note = memo(
	({
		note,
		setLastSelectedNote,
		setSelectedNote,
		userId
	}: {
		note: NoteType
		setLastSelectedNote: (value: SetStateAction<string>) => void
		setSelectedNote: (fn: NoteType | ((prev: NoteType | null) => NoteType | null) | null) => void
		userId: number
	}) => {
		const routeParent = useRouteParent()

		const participantsWithoutUser = useMemo(() => {
			return note.participants.filter(p => p.userId !== userId)
		}, [note.participants, userId])

		const select = useCallback(() => {
			setLastSelectedNote(note.uuid)
			setSelectedNote(note)
		}, [setSelectedNote, note, setLastSelectedNote])

		return (
			<ContextMenu note={note}>
				<Link
					className={cn(
						"flex flex-row gap-4 p-4 border-l-[3px] hover:bg-primary-foreground h-full",
						routeParent === note.uuid ? "border-l-blue-500 bg-primary-foreground" : "border-transparent"
					)}
					to="/notes/$uuid"
					params={{
						uuid: note.uuid
					}}
					onClick={select}
				>
					<div className="flex flex-col gap-2 h-full">
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
						{note.pinned && (
							<Icon
								name="pin"
								className="text-muted-foreground"
							/>
						)}
					</div>
					<div className="flex flex-col grow h-full">
						<div className="flex flex-row items-center gap-2">
							{note.favorite && (
								<Icon
									name="heart"
									size={18}
								/>
							)}
							<p className="line-clamp-1 text-ellipsis break-all">{note.title}</p>
						</div>
						<p className="line-clamp-1 text-ellipsis text-muted-foreground text-sm mt-1 break-all">
							{note.preview ? note.preview : note.title}
						</p>
						<p className="line-clamp-1 text-ellipsis text-muted-foreground text-sm mt-1 break-all">
							{simpleDate(note.editedTimestamp)}
						</p>
						<div className="flex flex-row gap-2 flex-wrap w-full h-auto mt-2">
							{note.tags.map(tag => {
								return (
									<div
										key={tag.uuid}
										className="flex flex-row items-center justify-center px-2 py-1 rounded-lg h-7 text-sm border shadow-sm"
									>
										{tag.name}
									</div>
								)
							})}
						</div>
					</div>
					{participantsWithoutUser.length > 0 && (
						<div className="flex flex-row min-h-full justify-center items-center">
							{participantsWithoutUser.map(p => {
								return (
									<Avatar
										key={p.userId}
										className="w-7 h-7"
										src={p.avatar!}
										fallback={p.email}
									/>
								)
							})}
						</div>
					)}
				</Link>
			</ContextMenu>
		)
	}
)

export default Note
