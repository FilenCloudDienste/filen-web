import { memo, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import worker from "@/lib/worker"
import { useNotesStore } from "@/stores/notes.store"
import { Input } from "@/components/ui/input"
import Tags from "./tags"

export const Notes = memo(() => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { setNotes, search, setSearch } = useNotesStore()

	const createNote = useCallback(async () => {
		try {
			const { uuid } = await worker.createNote()
			const notes = await worker.listNotes()

			setNotes(notes)

			await new Promise<void>(resolve => setTimeout(resolve, 100))

			navigate({
				to: "/notes/$uuid",
				params: {
					uuid
				}
			})
		} catch (e) {
			console.error(e)
		}
	}, [navigate, setNotes])

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value)
		},
		[setSearch]
	)

	return (
		<div
			className="h-auto w-full flex flex-col border-b shadow-sm"
			id="inner-sidebar-top-notes"
		>
			<div className="h-12 w-full flex flex-row items-center px-4 justify-between">
				<p>{t("innerSideBar.top.notes")}</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-lg p-1 cursor-pointer"
								onClick={createNote}
							>
								<Plus />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>{t("innerSideBar.notes.createNote")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex flex-row w-full h-auto px-4">
				<Input
					placeholder={t("innerSideBar.notes.search")}
					value={search}
					onChange={onChange}
				/>
			</div>
			<Tags />
		</div>
	)
})

export default Notes
