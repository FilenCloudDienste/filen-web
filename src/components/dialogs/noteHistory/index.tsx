import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import Content from "./content"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { X } from "lucide-react"

export const NoteHistoryDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [note, setNote] = useState<Note | null>(null)

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openNoteHistoryDialog", (n: Note) => {
			setNote(n)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogContent className="fullscreen-dialog no-close-button outline-none focus:outline-none active:outline-none hover:outline-none select-none">
				{note && (
					<div className="absolute w-screen h-screen flex flex-col">
						<div className="flex flex-row border-b h-[49px] bg-secondary w-full items-center justify-between px-4 z-50 gap-10 -mt-[1px]">
							<p className="line-clamp-1 text-ellipsis break-all">{note.title}</p>
							<X
								className="h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer"
								onClick={close}
							/>
						</div>
						<Content
							key={note.uuid}
							note={note}
							setOpen={setOpen}
						/>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
})

export default NoteHistoryDialog
