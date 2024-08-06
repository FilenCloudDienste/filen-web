import { memo, useCallback } from "react"
import { useNotesStore } from "@/stores/notes.store"
import { CheckCircle2, Loader, MoreVertical, RefreshCwOff } from "lucide-react"
import { showInputDialog } from "@/components/dialogs/input"
import worker from "@/lib/worker"
import ContextMenu from "../innerSideBar/notes/note/contextMenu"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { MAX_NOTE_SIZE } from "@filen/sdk"

export const Notes = memo(() => {
	const { selectedNote, setSelectedNote, setNotes, synced, maxSizeReached } = useNotesStore(
		useCallback(
			state => ({
				selectedNote: state.selectedNote,
				setSelectedNote: state.setSelectedNote,
				setNotes: state.setNotes,
				synced: state.synced,
				maxSizeReached: state.maxSizeReached
			}),
			[]
		)
	)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { dark } = useTheme()
	const { t } = useTranslation()

	const triggerMoreIconContextMenu = useCallback(
		(e: React.MouseEvent<SVGSVGElement, MouseEvent> | React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.preventDefault()
			e.stopPropagation()

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
			title: t("notes.dialogs.renameNote.title"),
			continueButtonText: t("notes.dialogs.renameNote.continue"),
			value: selectedNote.title,
			autoFocusInput: true,
			placeholder: t("notes.dialogs.renameNote.placeholder"),
			continueButtonVariant: "default"
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

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [selectedNote, setSelectedNote, setNotes, loadingToast, errorToast, t])

	const noop = useCallback(() => {}, [])

	if (!selectedNote) {
		return null
	}

	return (
		<div
			className="w-full h-12 flex flex-row justify-between border-b select-none"
			style={{
				// @ts-expect-error not typed
				WebkitAppRegion: "drag"
			}}
		>
			<div className={cn("flex flex-row px-4 items-center gap-3 w-full h-12 z-50", dark ? "bg-[#151518]" : "bg-[#FFFFFF]")}>
				<div
					className="flex flex-row"
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "no-drag"
					}}
				>
					{maxSizeReached ? (
						<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
							<Tooltip>
								<TooltipTrigger asChild={true}>
									<RefreshCwOff
										className="text-red-500"
										size={20}
									/>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									<p>{t("notes.maxSizeReached", { chars: MAX_NOTE_SIZE - 64 })}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					) : (
						<>
							{synced ? (
								<CheckCircle2
									className="text-green-500"
									size={20}
								/>
							) : (
								<Loader
									className="animate-spin-medium"
									size={20}
								/>
							)}
						</>
					)}
				</div>
				<div className="flex flex-row grow">
					<p
						className="line-clamp-1 text-ellipsis break-all cursor-text"
						onClick={rename}
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "no-drag"
						}}
					>
						{selectedNote.title}
					</p>
				</div>
				<div className="flex flex-row">
					<ContextMenu
						note={selectedNote}
						setHovering={noop}
					>
						<div
							className="flex flex-row p-1 rounded-md hover:bg-secondary cursor-pointer"
							onClick={triggerMoreIconContextMenu}
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
						>
							<MoreVertical
								onClick={triggerMoreIconContextMenu}
								className="cursor-pointer"
							/>
						</div>
					</ContextMenu>
				</div>
			</div>
		</div>
	)
})

export default Notes
