import { memo, useMemo, useCallback, useRef } from "react"
import { Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import Tree from "./tree"
import { validate as validateUUID } from "uuid"
import { useLocalStorage } from "@uidotdev/usehooks"
import { ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
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
	FolderOutput,
	FolderInput,
	Star,
	HardDrive,
	Globe
} from "lucide-react"
import useLocation from "@/hooks/useLocation"
import { useContactsStore } from "@/stores/contacts.store"
import useAccount from "@/hooks/useAccount"
import useIsMobile from "@/hooks/useIsMobile"
import { TbBucket } from "react-icons/tb"

export const Button = memo(({ uuid }: { uuid: string }) => {
	const { baseFolderUUID } = useSDKConfig()
	const routeParent = useRouteParent()
	const [sideBarTreeOpen, setSideBarTreeOpen] = useLocalStorage<Record<string, boolean>>("sideBarTreeOpen", {})
	const { t } = useTranslation()
	const location = useLocation()
	const { requestsInCount } = useContactsStore()
	const account = useAccount(false)
	const isMobile = useIsMobile()
	const iconSize = useRef<number>(isMobile ? 20 : 19).current

	const link = useMemo(() => {
		const uuidEx = uuid.split("/")

		return {
			to: uuid.includes("mounts")
				? "/mounts/$type"
				: uuid.includes("settings")
					? "/settings/$type"
					: uuid.includes("contacts")
						? "/contacts/$type"
						: "/drive/$",
			params:
				uuid.includes("settings") || uuid.includes("contacts") || uuid.includes("mounts")
					? {
							type: uuidEx[1]
						}
					: {
							_splat: uuid
						}
		}
	}, [uuid])

	const openTree = useCallback(() => {
		setSideBarTreeOpen(prev => ({ ...prev, [uuid]: true }))
	}, [setSideBarTreeOpen, uuid])

	const closeTree = useCallback(() => {
		setSideBarTreeOpen({})
	}, [setSideBarTreeOpen])

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
						<div className="flex flex-row gap-2 items-center">
							{!isMobile && (
								<>
									{!sideBarTreeOpen[uuid] ? (
										<ChevronRight
											size={iconSize - 2}
											onClick={openTree}
											className="shrink-0"
										/>
									) : (
										<ChevronDown
											size={iconSize - 2}
											onClick={closeTree}
											className="shrink-0"
										/>
									)}
								</>
							)}
							<ColoredFolderSVGIcon
								width={20}
								height={20}
							/>
						</div>
						{!isMobile && <p>{t("innerSideBar.cloudDrive")}</p>}
					</>
				)}
				{uuid === "recents" && (
					<>
						<Timer
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.recents")}</p>}
					</>
				)}
				{uuid === "favorites" && (
					<>
						<Heart
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.favorites")}</p>}
					</>
				)}
				{uuid === "trash" && (
					<>
						<Trash
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.trash")}</p>}
					</>
				)}
				{uuid === "shared-in" && (
					<>
						<FolderInput
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.sharedWithMe")}</p>}
					</>
				)}
				{uuid === "shared-out" && (
					<>
						<FolderOutput
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.sharedWithOthers")}</p>}
					</>
				)}
				{uuid === "links" && (
					<>
						<LinkIcon
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.links")}</p>}
					</>
				)}
				{uuid === "settings/general" && (
					<>
						<Settings
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.general")}</p>}
					</>
				)}
				{uuid === "contacts/all" && (
					<>
						<Contact
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.contacts.all")}</p>}
					</>
				)}
				{uuid === "contacts/online" && (
					<>
						<Nfc
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.contacts.online")}</p>}
					</>
				)}
				{uuid === "contacts/offline" && (
					<>
						<CloudOff
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.contacts.offline")}</p>}
					</>
				)}
				{uuid === "contacts/blocked" && (
					<>
						<XCircle
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.contacts.blocked")}</p>}
					</>
				)}
				{uuid === "contacts/in" && (
					<>
						<Mail
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && (
							<>
								<p>{t("innerSideBar.contacts.in")}</p>
								{requestsInCount > 0 && (
									<div className="w-[20px] h-[20px] rounded-full bg-red-500 text-white flex flex-row items-center justify-center text-xs">
										{requestsInCount >= 9 ? "9+" : requestsInCount}
									</div>
								)}
							</>
						)}
					</>
				)}
				{uuid === "contacts/out" && (
					<>
						<Send
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.contacts.out")}</p>}
					</>
				)}
				{uuid === "settings/account" && (
					<>
						<User2
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.account")}</p>}
					</>
				)}
				{uuid === "settings/security" && (
					<>
						<Shield
							size={iconSize}
							className={cn("shrink-0", account && !account.account.didExportMasterKeys && "text-red-500")}
						/>
						{!isMobile && (
							<p className={cn(account && !account.account.didExportMasterKeys && "text-red-500")}>
								{t("innerSideBar.settings.security")}
							</p>
						)}
					</>
				)}
				{uuid === "settings/subscriptions" && (
					<>
						<Gem
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.subscriptions")}</p>}
					</>
				)}
				{uuid === "settings/invoices" && (
					<>
						<Wallet
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.invoices")}</p>}
					</>
				)}
				{uuid === "settings/events" && (
					<>
						<CalendarClock
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.events")}</p>}
					</>
				)}
				{uuid === "settings/invite" && (
					<>
						<UserPlus
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.invite")}</p>}
					</>
				)}
				{uuid === "settings/plans" && (
					<>
						<Star
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.settings.plans")}</p>}
					</>
				)}
				{uuid === "mounts/virtual-drive" && (
					<>
						<HardDrive
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.mounts.virtualDrive")}</p>}
					</>
				)}
				{uuid === "mounts/webdav" && (
					<>
						<Globe
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.mounts.webdav")}</p>}
					</>
				)}
				{uuid === "mounts/s3" && (
					<>
						<TbBucket
							size={iconSize}
							className="shrink-0"
						/>
						{!isMobile && <p>{t("innerSideBar.mounts.s3")}</p>}
					</>
				)}
			</Link>
			{!isMobile && (
				<div className="flex flex-col w-full overflow-hidden">
					{validateUUID(uuid) && baseFolderUUID === uuid && sideBarTreeOpen[uuid] && (
						<Tree
							parent={uuid}
							depth={1}
							pathname={uuid}
						/>
					)}
				</div>
			)}
		</div>
	)
})

export default Button
