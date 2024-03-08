import { memo } from "react"
import { Input } from "@/components/ui/input"
import { SearchIcon, SettingsIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import useGlobalState from "@/hooks/useGlobalState"

export const TopBar = memo(() => {
	const { t } = useTranslation()
	const [search, setSearch] = useGlobalState<string>("search", "")

	return (
		<div className="w-full h-14 border-b flex flex-row pl-3 pr-3">
			<div className="flex flex-row flex-1 justify-start items-center w-1/4">
				<div className="absolute h-full pl-2">
					<div className="h-full flex flex-row items-center">
						<SearchIcon
							className="text-muted-foreground"
							size={22}
						/>
					</div>
				</div>
				<Input
					className="pl-10 text-base max-w-md shadow-md bg-accent"
					placeholder={t("topbar.placeholders.normal.search")}
					value={search}
					onChange={e => setSearch(e.target.value)}
				/>
			</div>
			<div className="flex flex-row flex-1 justify-end items-center">
				<Link to="/settings/general">
					<Button
						variant="outline"
						size="icon"
						className="border-none text-muted-foreground hover:text-primary bg-transparent"
					>
						<SettingsIcon className="h-5 w-5" />
					</Button>
				</Link>
			</div>
		</div>
	)
})

export default TopBar
