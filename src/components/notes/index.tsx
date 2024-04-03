import { memo } from "react"
import { useNotesStore } from "@/stores/notes.store"
import { cn } from "@/lib/utils"
import Content from "./content"

export const Notes = memo(() => {
	const { selectedNote } = useNotesStore()

	return (
		<div className={cn("w-full h-[calc(100vh-48px)] flex flex-col border-t", !selectedNote && "items-center justify-center")}>
			{selectedNote ? <Content note={selectedNote} /> : "create notes"}
		</div>
	)
})

export default Notes
