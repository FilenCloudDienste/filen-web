import { memo, useCallback } from "react"
import { useNotesStore } from "@/stores/notes.store"
import Icon from "@/components/icon"
import { showInputDialog } from "@/components/dialogs/input"
import worker from "@/lib/worker"
import ContextMenu from "../innerSideBar/notes/note/contextMenu"

export const Notes = memo(() => {
	const { selectedNote, setSelectedNote, setNotes, synced } = useNotesStore()

	const triggerMoreIconContextMenu = useCallback(
		(e: React.MouseEvent<SVGSVGElement, MouseEvent> | React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.preventDefault()

			const contextMenuEvent = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				view: window,
				clientX: e.clientX,
				clientY: e.clientY
			})

			e.currentTarget.dispatchEvent(contextMenuEvent)
		},
		[]
	)

	const rename = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		try {
			const inputResponse = await showInputDialog({
				title: "title",
				continueButtonText: "edit",
				value: selectedNote.title,
				autoFocusInput: true,
				placeholder: "Title"
			})

			if (inputResponse.cancelled) {
				return
			}

			await worker.editNoteTitle({ uuid: selectedNote.uuid, title: inputResponse.value })

			setSelectedNote(prev => (prev ? { ...prev, title: inputResponse.value } : prev))
			setNotes(prev =>
				prev.map(prevNote => (prevNote.uuid === selectedNote.uuid ? { ...prevNote, title: inputResponse.value } : prevNote))
			)
		} catch (e) {
			console.error(e)
		}
	}, [selectedNote, setSelectedNote, setNotes])

	if (!selectedNote) {
		return null
	}

	return (
		<div className="flex flex-row px-4 items-center gap-3 w-full h-12 z-50 bg-background shadow-sm">
			<div className="flex flex-row">
				{synced ? (
					<Icon
						name="check-circle-2"
						className="text-green-500"
					/>
				) : (
					<Icon
						name="loader"
						className="animate-spin-medium"
					/>
				)}
			</div>
			<div className="flex flex-row grow">
				<p
					className="line-clamp-1 text-ellipsis break-all cursor-text"
					onClick={rename}
				>
					{selectedNote.title}
				</p>
			</div>
			<div className="flex flex-row">
				<ContextMenu note={selectedNote}>
					<div
						className="flex flex-row p-1 rounded-lg hover:bg-secondary cursor-pointer"
						onClick={triggerMoreIconContextMenu}
					>
						<Icon
							name="more-vertical"
							onClick={triggerMoreIconContextMenu}
							className="cursor-pointer"
						/>
					</div>
				</ContextMenu>
			</div>
		</div>
	)
})

export default Notes
