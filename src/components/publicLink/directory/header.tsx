import { memo, useCallback } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useTranslation } from "react-i18next"
import { ArrowUp, ArrowDown } from "lucide-react"
import { type DriveSortBy } from "@/components/drive/list/header"
import { type DriveCloudItem } from "@/components/drive"
import { cn } from "@/lib/utils"

const iconSize = 14

export const Header = memo(({ parent, items }: { parent: string; items: DriveCloudItem[] }) => {
	const [driveSortBy, setDriveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})
	const { t } = useTranslation()

	const name = useCallback(() => {
		setDriveSortBy(prev => ({
			...prev,
			[parent]: prev[parent] === "nameDesc" ? "nameAsc" : "nameDesc"
		}))
	}, [setDriveSortBy, parent])

	const size = useCallback(() => {
		setDriveSortBy(prev => ({
			...prev,
			[parent]: prev[parent] === "sizeDesc" ? "sizeAsc" : "sizeDesc"
		}))
	}, [setDriveSortBy, parent])

	const modified = useCallback(() => {
		setDriveSortBy(prev => ({
			...prev,
			[parent]: prev[parent] === "lastModifiedDesc" ? "lastModifiedAsc" : "lastModifiedDesc"
		}))
	}, [setDriveSortBy, parent])

	if (items.length === 0) {
		return null
	}

	return (
		<div className="flex flex-row px-3 text-sm">
			<div className="flex flex-row w-full h-10 items-center select-none gap-3">
				<div
					className="flex flex-row grow min-w-[200px] items-center cursor-pointer"
					onClick={name}
				>
					<div
						className={cn(
							"flex flex-row gap-2 items-center",
							!driveSortBy[parent] || driveSortBy[parent] === "nameAsc" || driveSortBy[parent] === "nameDesc"
								? "text-primary"
								: "text-muted-foreground"
						)}
					>
						<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{t("drive.header.name")}</p>
						{(!driveSortBy[parent] || driveSortBy[parent] === "nameAsc") && <ArrowUp size={iconSize} />}
						{driveSortBy[parent] === "nameDesc" && <ArrowDown size={iconSize} />}
					</div>
				</div>
				<div
					className="flex flex-row w-[125px] items-center cursor-pointer"
					onClick={size}
				>
					<div
						className={cn(
							"flex flex-row gap-2 items-center",
							driveSortBy[parent] === "sizeAsc" || driveSortBy[parent] === "sizeDesc"
								? "text-primary"
								: "text-muted-foreground"
						)}
					>
						<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{t("drive.header.size")}</p>
						{driveSortBy[parent] === "sizeAsc" && <ArrowUp size={iconSize} />}
						{driveSortBy[parent] === "sizeDesc" && <ArrowDown size={iconSize} />}
					</div>
				</div>
				<div
					className="flex flex-row w-[250px] items-center cursor-pointer"
					onClick={modified}
				>
					<div
						className={cn(
							"flex flex-row gap-2 items-center",
							driveSortBy[parent] === "lastModifiedAsc" || driveSortBy[parent] === "lastModifiedDesc"
								? "text-primary"
								: "text-muted-foreground"
						)}
					>
						<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{t("drive.header.modified")}</p>
						{driveSortBy[parent] === "lastModifiedAsc" && <ArrowUp size={iconSize} />}
						{driveSortBy[parent] === "lastModifiedDesc" && <ArrowDown size={iconSize} />}
					</div>
				</div>
			</div>
		</div>
	)
})

export default Header
