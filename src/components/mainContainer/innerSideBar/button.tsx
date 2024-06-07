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
	Settings,
	Contact,
	Nfc,
	CloudOff,
	XCircle,
	Mail,
	CalendarClock,
	Shield,
	Gem,
	Wallet,
	User2,
	UserPlus,
	Send,
	PhoneIncoming,
	PhoneOutgoing,
	Star
} from "lucide-react"
import useLocation from "@/hooks/useLocation"
import { useContactsStore } from "@/stores/contacts.store"

const iconSize = 18

export const Button = memo(({ uuid }: { uuid: string }) => {
	const { baseFolderUUID } = useSDKConfig()
	const routeParent = useRouteParent()
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const { t } = useTranslation()
	const location = useLocation()
	const { requestsInCount } = useContactsStore()

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
		<div className="flex flex-col mb-0.5 px-3">
			<Link
				to={link.to}
				params={link.params}
				draggable={false}
				className={cn(
					"flex flex-row gap-2.5 w-full px-3 py-2 rounded-md transition-all items-center hover:bg-secondary text-primary cursor-pointer",
					routeParent === uuid || location === `/${uuid}` ? "bg-secondary" : "bg-transparent"
				)}
			>
				{uuid === baseFolderUUID && (
					<>
						<div className="flex flex-row gap-2">
							{!sideBarTreeOpen[uuid] ? (
								<ChevronRight
									size={iconSize - 2}
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: true }))}
									className="shrink-0"
								/>
							) : (
								<ChevronDown
									size={iconSize - 2}
									onClick={() => setSideBarTreeOpen(prev => ({ ...prev, [uuid]: false }))}
									className="shrink-0"
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
						<Timer
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.recents")}</p>
					</>
				)}
				{uuid === "favorites" && (
					<>
						<Heart
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.favorites")}</p>
					</>
				)}
				{uuid === "trash" && (
					<>
						<Trash
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.trash")}</p>
					</>
				)}
				{uuid === "shared-in" && (
					<>
						<PhoneIncoming
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.sharedWithMe")}</p>
					</>
				)}
				{uuid === "shared-out" && (
					<>
						<PhoneOutgoing
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.sharedWithOthers")}</p>
					</>
				)}
				{uuid === "links" && (
					<>
						<LinkIcon
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.links")}</p>
					</>
				)}
				{uuid === "settings/general" && (
					<>
						<Settings
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.general")}</p>
					</>
				)}
				{uuid === "contacts/all" && (
					<>
						<Contact
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.contacts.all")}</p>
					</>
				)}
				{uuid === "contacts/online" && (
					<>
						<Nfc
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.contacts.online")}</p>
					</>
				)}
				{uuid === "contacts/offline" && (
					<>
						<CloudOff
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.contacts.offline")}</p>
					</>
				)}
				{uuid === "contacts/blocked" && (
					<>
						<XCircle
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.contacts.blocked")}</p>
					</>
				)}
				{uuid === "contacts/in" && (
					<>
						<Mail
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.contacts.in")}</p>
						{requestsInCount > 0 && (
							<div className="w-[20px] h-[20px] rounded-full bg-red-500 text-white flex flex-row items-center justify-center text-xs">
								{requestsInCount >= 9 ? "9+" : requestsInCount}
							</div>
						)}
					</>
				)}
				{uuid === "contacts/out" && (
					<>
						<Send
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.contacts.out")}</p>
					</>
				)}
				{uuid === "settings/account" && (
					<>
						<User2
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.account")}</p>
					</>
				)}
				{uuid === "settings/security" && (
					<>
						<Shield
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.security")}</p>
					</>
				)}
				{uuid === "settings/subscriptions" && (
					<>
						<Gem
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.subscriptions")}</p>
					</>
				)}
				{uuid === "settings/invoices" && (
					<>
						<Wallet
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.invoices")}</p>
					</>
				)}
				{uuid === "settings/events" && (
					<>
						<CalendarClock
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.events")}</p>
					</>
				)}
				{uuid === "settings/invite" && (
					<>
						<UserPlus
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.invite")}</p>
					</>
				)}
				{uuid === "settings/plans" && (
					<>
						<Star
							size={iconSize}
							className="shrink-0"
						/>
						<p>{t("innerSideBar.settings.plans")}</p>
					</>
				)}
			</Link>
			<div className="flex flex-col w-full overflow-hidden">
				{validateUUID(uuid) && baseFolderUUID === uuid && sideBarTreeOpen[uuid] && (
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
