import { memo, useCallback } from "react"
import { useNotesStore } from "@/stores/notes.store"
import { CheckCircle2, Loader, MoreVertical } from "lucide-react"
import { showInputDialog } from "@/components/dialogs/input"
import worker from "@/lib/worker"
import ContextMenu from "../innerSideBar/notes/note/contextMenu"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/themeProvider"

export const Notes = memo(() => {
	const { selectedNote, setSelectedNote, setNotes, synced } = useNotesStore()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { dark } = useTheme()

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

		const toast = loadingToast()

		try {
			await worker.editNoteTitle({ uuid: selectedNote.uuid, title: inputResponse.value })

			setSelectedNote(prev => (prev ? { ...prev, title: inputResponse.value } : prev))
			setNotes(prev =>
				prev.map(prevNote => (prevNote.uuid === selectedNote.uuid ? { ...prevNote, title: inputResponse.value } : prevNote))
			)
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedNote, setSelectedNote, setNotes, loadingToast, errorToast])

	if (!selectedNote) {
		return null
	}

	return (
		<div className={cn("flex flex-row px-4 items-center gap-3 w-full h-12 z-50 shadow-sm", dark ? "bg-[#151518]" : "")}>
			<div className="flex flex-row">
				{synced ? <CheckCircle2 className="text-green-500" /> : <Loader className="animate-spin-medium" />}
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
				<ContextMenu
					note={selectedNote}
					setHovering={() => {}}
				>
					<div
						className="flex flex-row p-1 rounded-md hover:bg-secondary cursor-pointer"
						onClick={triggerMoreIconContextMenu}
					>
						<MoreVertical
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
