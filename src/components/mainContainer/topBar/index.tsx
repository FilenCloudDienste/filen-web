import { memo } from "react"
import { Input } from "@/components/ui/input"
import { SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import Breadcrumbs from "./breadcrumbs"

export const TopBar = memo(() => {
	const { t } = useTranslation()

	return (
		<div className="w-full h-12 flex flex-row shadow-sm justify-between border-b select-none">
			<Breadcrumbs />
			<div className="flex flex-row justify-end items-center z-10 bg-white dark:bg-neutral-950 px-3">
				<div className="flex flex-row w-[250px] h-full items-center">
					<div className="absolute h-full pl-2">
						<div className="h-full flex flex-row items-center">
							<SearchIcon
								className="text-muted-foreground"
								size={16}
							/>
						</div>
					</div>
					<Input
						className="pl-8 text-sm max-w-lg shadow-sm h-8"
						placeholder={t("topBar.searchInThisFolder")}
					/>
				</div>
			</div>
		</div>
	)
})

export default TopBar
