import { memo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { useSyncsStore } from "@/stores/syncs.store"
import Input from "@/components/input"
import eventEmitter from "@/lib/eventEmitter"

export const Syncs = memo(() => {
	const { t } = useTranslation()
	const { search, setSearch } = useSyncsStore()

	const createNote = useCallback(async () => {
		eventEmitter.emit("openCreateSyncDialog")
	}, [])

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value)
		},
		[setSearch]
	)

	const clearSearch = useCallback(() => {
		setSearch("")
	}, [setSearch])

	return (
		<div
			className="h-auto w-full flex flex-col"
			id="inner-sidebar-top-syncs"
		>
			<div
				className="h-12 w-full flex flex-row items-center px-4 justify-between"
				style={{
					// @ts-expect-error not typed
					WebkitAppRegion: "drag"
				}}
			>
				<p>{t("innerSideBar.top.syncs")}</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-md p-1 cursor-pointer"
								onClick={createNote}
								style={{
									// @ts-expect-error not typed
									WebkitAppRegion: "no-drag"
								}}
							>
								<Plus />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>{t("innerSideBar.syncs.createSync")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex flex-row w-full h-auto px-4">
				<Input
					placeholder={t("innerSideBar.syncs.search")}
					value={search}
					onChange={onChange}
					withSearchIcon={true}
					withClearIcon={true}
					onClear={clearSearch}
					autoCapitalize="none"
					autoComplete="none"
					autoCorrect="none"
				/>
			</div>
		</div>
	)
})

export default Syncs
