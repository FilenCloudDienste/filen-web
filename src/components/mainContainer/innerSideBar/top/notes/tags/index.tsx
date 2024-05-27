import { memo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Heart, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { showInputDialog } from "@/components/dialogs/input"
import { useNotesStore } from "@/stores/notes.store"
import { cn } from "@/lib/utils"
import ContextMenu from "./contextMenu"

export const tagClassName =
	"flex flex-row gap-1 items-center justify-center px-2 py-1 rounded-md bg-muted/30 hover:bg-secondary cursor-pointer h-7 text-sm"

export const Tags = memo(() => {
	const { t } = useTranslation()
	const { activeTag, setActiveTag } = useNotesStore()

	const query = useQuery({
		queryKey: ["listNotesTags"],
		queryFn: () => worker.listNotesTags()
	})

	const createTag = useCallback(async () => {
		try {
			const inputResponse = await showInputDialog({
				title: t("notes.dialogs.createTag.title"),
				continueButtonText: t("notes.dialogs.createTag.continue"),
				value: "",
				autoFocusInput: true,
				placeholder: t("notes.dialogs.createTag.placeholder"),
				continueButtonVariant: "default"
			})

			if (inputResponse.cancelled || ["all", "favorites", "pinned"].includes(inputResponse.value.toLowerCase().trim())) {
				return
			}

			await worker.createNotesTag({ name: inputResponse.value.trim() })
			await query.refetch()
		} catch (e) {
			console.error(e)
		}
	}, [query, t])

	return (
		<div className="flex flex-row w-full h-auto p-4 flex-wrap gap-2">
			<div
				className={cn(tagClassName, activeTag === "all" && "bg-secondary")}
				onClick={() => setActiveTag("all")}
			>
				{t("innerSideBar.notes.tags.all")}
			</div>
			<div
				className={cn(tagClassName, activeTag === "favorites" && "bg-secondary")}
				onClick={() => setActiveTag("favorites")}
			>
				{t("innerSideBar.notes.tags.favorites")}
			</div>
			<div
				className={cn(tagClassName, activeTag === "pinned" && "bg-secondary")}
				onClick={() => setActiveTag("pinned")}
			>
				{t("innerSideBar.notes.tags.pinned")}
			</div>
			{query.isSuccess &&
				query.data.map(tag => {
					return (
						<ContextMenu
							tag={tag}
							key={tag.uuid}
							refetch={query.refetch}
						>
							<div
								className={cn(tagClassName, activeTag === tag.uuid && "bg-secondary")}
								onClick={() => setActiveTag(tag.uuid)}
							>
								{tag.favorite && <Heart size={14} />}
								<p className="line-clamp-1 break-all text-ellipsis">{tag.name}</p>
							</div>
						</ContextMenu>
					)
				})}
			<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<div
							className={tagClassName}
							onClick={createTag}
						>
							<Plus size={18} />
						</div>
					</TooltipTrigger>
					<TooltipContent side="left">
						<p>{t("innerSideBar.notes.createTag")}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
})

export default Tags
