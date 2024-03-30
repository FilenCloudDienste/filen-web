import { memo } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import Tree from "./tree"
import { validate as validateUUID } from "uuid"
import { useLocalStorage } from "@uidotdev/usehooks"
import { folderIcon } from "@/assets/fileExtensionIcons"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import Icon from "@/components/icon"

const iconSize = 20

export const Button = memo(({ uuid }: { uuid: string }) => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const { t } = useTranslation()
	const routerState = useRouterState()

	return (
		<div className="flex flex-col mb-1 px-3">
			<Link
				to="/drive/$"
				params={{
					_splat: uuid
				}}
				draggable={false}
				className={cn(
					"flex flex-row gap-3 w-full px-3 py-2 rounded-lg transition-all items-center hover:bg-accent text-primary cursor-pointer",
					routeParent === uuid || routerState.location.pathname === `/${uuid}` ? "bg-accent" : "bg-transparent"
				)}
			>
				{uuid === sdkConfig.baseFolderUUID && (
					<>
						<div className="flex flex-row gap-2">
							{!sideBarTreeOpen[uuid] ? (
								<Icon
									name="chevron-right"
									size={iconSize - 2}
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: true }))}
								/>
							) : (
								<Icon
									name="chevron-down"
									size={iconSize - 2}
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: false }))}
								/>
							)}
							<img
								src={folderIcon}
								className="w-5 h-5 shrink-0"
								draggable={false}
							/>
						</div>
						<p>{t("innerSideBar.cloudDrive")}</p>
					</>
				)}
				{uuid === "recents" && (
					<>
						<Icon
							name="timer"
							size={iconSize}
						/>
						<p>{t("innerSideBar.recents")}</p>
					</>
				)}
				{uuid === "favorites" && (
					<>
						<Icon
							name="heart"
							size={iconSize}
						/>
						<p>{t("innerSideBar.favorites")}</p>
					</>
				)}
				{uuid === "trash" && (
					<>
						<Icon
							name="trash"
							size={iconSize}
						/>
						<p>{t("innerSideBar.trash")}</p>
					</>
				)}
				{uuid === "shared-in" && (
					<>
						<Icon
							name="notebook"
							size={iconSize}
						/>
						<p>{t("innerSideBar.sharedWithMe")}</p>
					</>
				)}
				{uuid === "shared-out" && (
					<>
						<Icon
							name="message-circle"
							size={iconSize}
						/>
						<p>{t("innerSideBar.sharedWithOthers")}</p>
					</>
				)}
				{uuid === "links" && (
					<>
						<Icon
							name="link"
							size={iconSize}
						/>
						<p>{t("innerSideBar.links")}</p>
					</>
				)}
				{uuid === "settings/general" && (
					<>
						<Icon
							name="settings"
							size={iconSize}
						/>
						<p>{t("innerSideBar.settings.general")}</p>
					</>
				)}
			</Link>
			<div className="flex flex-col w-full overflow-hidden">
				{validateUUID(uuid) && sdkConfig.baseFolderUUID === uuid && sideBarTreeOpen[uuid] && (
					<Tree
						parent={uuid}
						depth={1}
						pathname={uuid}
					/>
				)}
			</div>
		</div>
	)
})

export default Button
