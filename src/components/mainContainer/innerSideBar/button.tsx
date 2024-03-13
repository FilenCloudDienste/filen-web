import { memo } from "react"
import { Link } from "@tanstack/react-router"
import { TimerIcon, HeartIcon, TrashIcon, NotebookIcon, MessageCircleIcon, ChevronRightIcon, ChevronDownIcon, LinkIcon } from "lucide-react"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import Tree from "./tree"
import { validate as validateUUID } from "uuid"
import { useLocalStorage } from "@uidotdev/usehooks"
import { folderIcon } from "@/assets/fileExtensionIcons"
import { useTranslation } from "react-i18next"

const iconSize = 20

export const Button = memo(({ uuid }: { uuid: string }) => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const { t } = useTranslation()

	return (
		<div className="flex flex-col mb-1 px-3">
			<Link
				to="/drive/$"
				params={{
					_splat: uuid
				}}
				draggable={false}
				className={`flex flex-row gap-3 w-full px-3 py-2 rounded-lg transition-all items-center hover:bg-accent text-primary cursor-pointer ${routeParent === uuid ? "bg-accent" : "bg-transparent"}`}
			>
				{uuid === sdkConfig.baseFolderUUID && (
					<>
						<div className="flex flex-row gap-2">
							{!sideBarTreeOpen[uuid] ? (
								<ChevronRightIcon
									className="cursor-pointer"
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: true }))}
									size={iconSize - 2}
								/>
							) : (
								<ChevronDownIcon
									className="cursor-pointer"
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: false }))}
									size={iconSize - 2}
								/>
							)}
							<img
								src={folderIcon}
								className="w-5 h-5 shrink-0"
							/>
						</div>
						<p>{t("innerSideBar.cloudDrive")}</p>
					</>
				)}
				{uuid === "recents" && (
					<>
						<TimerIcon size={iconSize} />
						<p>{t("innerSideBar.recents")}</p>
					</>
				)}
				{uuid === "favorites" && (
					<>
						<HeartIcon size={iconSize} />
						<p>{t("innerSideBar.favorites")}</p>
					</>
				)}
				{uuid === "trash" && (
					<>
						<TrashIcon size={iconSize} />
						<p>{t("innerSideBar.trash")}</p>
					</>
				)}
				{uuid === "shared-in" && (
					<>
						<NotebookIcon size={iconSize} />
						<p>{t("innerSideBar.sharedWithMe")}</p>
					</>
				)}
				{uuid === "shared-out" && (
					<>
						<MessageCircleIcon size={iconSize} />
						<p>{t("innerSideBar.sharedWithOthers")}</p>
					</>
				)}
				{uuid === "links" && (
					<>
						<LinkIcon size={iconSize} />
						<p>{t("innerSideBar.links")}</p>
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
