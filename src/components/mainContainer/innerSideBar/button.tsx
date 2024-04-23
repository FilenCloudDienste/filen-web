import { memo, useMemo } from "react"
import { Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import Tree from "./tree"
import { validate as validateUUID } from "uuid"
import { useLocalStorage } from "@uidotdev/usehooks"
import { folderIcon } from "@/assets/fileExtensionIcons"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import {
	ChevronRight,
	ChevronDown,
	Timer,
	Heart,
	Link as LinkIcon,
	Trash,
	Notebook,
	MessageCircle,
	Settings,
	Contact,
	Nfc,
	CloudOff,
	XCircle
} from "lucide-react"
import useLocation from "@/hooks/useLocation"

const iconSize = 20

export const Button = memo(({ uuid }: { uuid: string }) => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const { t } = useTranslation()
	const location = useLocation()

	const link = useMemo(() => {
		const uuidEx = uuid.split("/")

		return {
			to: uuid.includes("settings") ? "/settings/$type" : uuid.includes("contacts") ? "/contacts/$type" : "/drive/$",
			params:
				uuid.includes("settings") || uuid.includes("contacts")
					? {
							type: uuidEx[1]
						}
					: {
							_splat: uuid
						}
		}
	}, [uuid])

	return (
		<div className="flex flex-col mb-1 px-3">
			<Link
				to={link.to}
				params={link.params}
				draggable={false}
				className={cn(
					"flex flex-row gap-3 w-full px-3 py-2 rounded-md transition-all items-center hover:bg-accent text-primary cursor-pointer",
					routeParent === uuid || location === `/${uuid}` ? "bg-accent" : "bg-transparent"
				)}
			>
				{uuid === sdkConfig.baseFolderUUID && (
					<>
						<div className="flex flex-row gap-2">
							{!sideBarTreeOpen[uuid] ? (
								<ChevronRight
									size={iconSize - 2}
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: true }))}
								/>
							) : (
								<ChevronDown
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
						<Timer size={iconSize} />
						<p>{t("innerSideBar.recents")}</p>
					</>
				)}
				{uuid === "favorites" && (
					<>
						<Heart size={iconSize} />
						<p>{t("innerSideBar.favorites")}</p>
					</>
				)}
				{uuid === "trash" && (
					<>
						<Trash size={iconSize} />
						<p>{t("innerSideBar.trash")}</p>
					</>
				)}
				{uuid === "shared-in" && (
					<>
						<Notebook size={iconSize} />
						<p>{t("innerSideBar.sharedWithMe")}</p>
					</>
				)}
				{uuid === "shared-out" && (
					<>
						<MessageCircle size={iconSize} />
						<p>{t("innerSideBar.sharedWithOthers")}</p>
					</>
				)}
				{uuid === "links" && (
					<>
						<LinkIcon size={iconSize} />
						<p>{t("innerSideBar.links")}</p>
					</>
				)}
				{uuid === "settings/general" && (
					<>
						<Settings size={iconSize} />
						<p>{t("innerSideBar.settings.general")}</p>
					</>
				)}
				{uuid === "contacts/all" && (
					<>
						<Contact size={iconSize} />
						<p>{t("innerSideBar.contacts.all")}</p>
					</>
				)}
				{uuid === "contacts/online" && (
					<>
						<Nfc size={iconSize} />
						<p>{t("innerSideBar.contacts.online")}</p>
					</>
				)}
				{uuid === "contacts/offline" && (
					<>
						<CloudOff size={iconSize} />
						<p>{t("innerSideBar.contacts.offline")}</p>
					</>
				)}
				{uuid === "contacts/blocked" && (
					<>
						<XCircle size={iconSize} />
						<p>{t("innerSideBar.contacts.blocked")}</p>
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
