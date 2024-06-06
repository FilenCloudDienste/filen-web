import { memo, useCallback } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import useRouteParent from "@/hooks/useRouteParent"
import { useTranslation } from "react-i18next"
import { ArrowUp, ArrowDown } from "lucide-react"
import { useDriveItemsStore } from "@/stores/drive.store"
import { cn } from "@/lib/utils"
import useDriveListColumnSize from "@/hooks/useDriveListColumnSize"

const iconSize = 14

export type DriveSortBy = Record<string, "nameAsc" | "nameDesc" | "sizeAsc" | "sizeDesc" | "lastModifiedAsc" | "lastModifiedDesc">

export const Header = memo(() => {
	const [driveSortBy, setDriveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})
	const routeParent = useRouteParent()
	const { t } = useTranslation()
	const { items } = useDriveItemsStore()
	const driveListColumnSize = useDriveListColumnSize()

	const name = useCallback(() => {
		setDriveSortBy(prev => ({
			...prev,
			[routeParent]: prev[routeParent] === "nameDesc" ? "nameAsc" : "nameDesc"
		}))
	}, [setDriveSortBy, routeParent])

	const size = useCallback(() => {
		setDriveSortBy(prev => ({
			...prev,
			[routeParent]: prev[routeParent] === "sizeDesc" ? "sizeAsc" : "sizeDesc"
		}))
	}, [setDriveSortBy, routeParent])

	const modified = useCallback(() => {
		setDriveSortBy(prev => ({
			...prev,
			[routeParent]: prev[routeParent] === "lastModifiedDesc" ? "lastModifiedAsc" : "lastModifiedDesc"
		}))
	}, [setDriveSortBy, routeParent])

	if (items.length === 0) {
		return null
	}

	return (
		<div className="flex flex-row text-sm">
			<div className="flex flex-row w-full h-8 items-center select-none gap-3 px-3">
				<div
					className="flex flex-row grow items-center cursor-pointer"
					onClick={name}
					style={{
						width: driveListColumnSize.name
					}}
				>
					<div
						className={cn(
							"flex flex-row gap-2 items-center",
							!driveSortBy[routeParent] || driveSortBy[routeParent] === "nameAsc" || driveSortBy[routeParent] === "nameDesc"
								? "text-primary"
								: "text-muted-foreground"
						)}
					>
						<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{t("drive.header.name")}</p>
						{(!driveSortBy[routeParent] || driveSortBy[routeParent] === "nameAsc") && <ArrowUp size={iconSize} />}
						{driveSortBy[routeParent] === "nameDesc" && <ArrowDown size={iconSize} />}
					</div>
				</div>
				<div
					className="flex flex-row items-center cursor-pointer"
					onClick={size}
					style={{
						width: driveListColumnSize.size
					}}
				>
					<div
						className={cn(
							"flex flex-row gap-2 items-center",
							driveSortBy[routeParent] === "sizeAsc" || driveSortBy[routeParent] === "sizeDesc"
								? "text-primary"
								: "text-muted-foreground"
						)}
					>
						<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{t("drive.header.size")}</p>
						{driveSortBy[routeParent] === "sizeAsc" && <ArrowUp size={iconSize} />}
						{driveSortBy[routeParent] === "sizeDesc" && <ArrowDown size={iconSize} />}
					</div>
				</div>
				<div
					className="flex flex-row items-center cursor-pointer"
					onClick={modified}
					style={{
						width: driveListColumnSize.modified
					}}
				>
					<div
						className={cn(
							"flex flex-row gap-2 items-center",
							driveSortBy[routeParent] === "lastModifiedAsc" || driveSortBy[routeParent] === "lastModifiedDesc"
								? "text-primary"
								: "text-muted-foreground"
						)}
					>
						<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">{t("drive.header.modified")}</p>
						{driveSortBy[routeParent] === "lastModifiedAsc" && <ArrowUp size={iconSize} />}
						{driveSortBy[routeParent] === "lastModifiedDesc" && <ArrowDown size={iconSize} />}
					</div>
				</div>
				<div
					className="flex flex-row"
					style={{
						width: driveListColumnSize.more
					}}
				>
					&nbsp;
				</div>
			</div>
		</div>
	)
})

export default Header
