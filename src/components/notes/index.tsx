import { memo, useCallback } from "react"
import { useNotesStore } from "@/stores/notes.store"
import { cn } from "@/lib/utils"
import Content from "./content"
import { useTranslation } from "react-i18next"
import { Notebook, Plus } from "lucide-react"
import { Button } from "../ui/button"
import eventEmitter from "@/lib/eventEmitter"

export const Notes = memo(() => {
	const { selectedNote, notes } = useNotesStore(useCallback(state => ({ selectedNote: state.selectedNote, notes: state.notes }), []))
	const { t } = useTranslation()

	const create = useCallback(() => {
		eventEmitter.emit("createNote")
	}, [])

	return (
		<div className={cn("w-full h-[calc(100dvh-48px)] flex flex-col border-t", !selectedNote && "items-center justify-center")}>
			{selectedNote ? (
				<Content
					key={`${selectedNote.uuid}-${selectedNote.type}`}
					note={selectedNote}
				/>
			) : notes.length === 0 ? (
				<div className="flex flex-row items-center justify-center w-full h-full">
					<div className="flex flex-col p-4 justify-center items-center">
						<Notebook
							width={128}
							height={128}
							className="text-muted-foreground"
						/>
						<p className="text-xl text-center mt-4">{t("notes.empty.title")}</p>
						<p className="text-muted-foreground text-center">{t("notes.empty.description")}</p>
						<Button
							variant="secondary"
							className="items-center gap-2 mt-4"
							onClick={create}
						>
							<Plus size={16} />
							{t("notes.empty.create")}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
})

export default Notes
