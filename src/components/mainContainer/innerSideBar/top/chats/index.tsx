import { memo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { useChatsStore } from "@/stores/chats.store"
import { Input } from "@/components/ui/input"

export const Chats = memo(() => {
	const { t } = useTranslation()
	const { search, setSearch } = useChatsStore()

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value)
		},
		[setSearch]
	)

	return (
		<div
			className="h-auto w-full flex flex-col border-b shadow-sm"
			id="inner-sidebar-top-chats"
		>
			<div className="h-12 w-full flex flex-row items-center px-4 justify-between">
				<p>{t("innerSideBar.top.chats")}</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-md p-1 cursor-pointer"
								onClick={() => {}}
							>
								<Plus />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>{t("innerSideBar.notes.createChat")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex flex-row w-full h-auto px-4 pb-4">
				<Input
					placeholder={t("innerSideBar.notes.search")}
					value={search}
					onChange={onChange}
				/>
			</div>
		</div>
	)
})

export default Chats
