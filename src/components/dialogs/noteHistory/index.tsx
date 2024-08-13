import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import Content from "./content"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { X } from "lucide-react"
import { IS_DESKTOP, IS_APPLE_DEVICE } from "@/constants"
import { cn } from "@/lib/utils"

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
					<div className="absolute w-screen h-[100dvh] flex flex-col">
						<div
							className="flex flex-row border-b h-[49px] -mt-[1px] bg-secondary w-full items-center justify-between px-4 z-50 gap-10"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "drag"
							}}
						>
							<p className={cn("line-clamp-1 text-ellipsis break-all", IS_APPLE_DEVICE && IS_DESKTOP && "pl-16")}>
								{note.title}
							</p>
							<div
								className="flex flex-row items-center justify-end h-12 w-12 opacity-70 hover:opacity-100 cursor-pointer"
								onClick={close}
								style={{
									// @ts-expect-error not typed
									WebkitAppRegion: "no-drag"
								}}
							>
								<X size={18} />
							</div>
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
