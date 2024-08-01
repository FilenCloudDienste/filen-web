import { memo, useCallback, useMemo } from "react"
import { HardDrive, Notebook, MessageCircle, Contact, ArrowDownUp, Settings, MessageCircleMore, Terminal } from "lucide-react"
import { Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { IS_DESKTOP, IS_APPLE_DEVICE } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import TransfersProgress from "./transfersProgress"
import { useLocalStorage } from "@uidotdev/usehooks"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import { useChatsStore } from "@/stores/chats.store"
import { useContactsStore } from "@/stores/contacts.store"
import LogoSVG from "@/assets/logo"
import SyncIndicator from "./syncIndicator"

const iconSize = IS_DESKTOP && IS_APPLE_DEVICE ? 26 : 24

export const Button = memo(({ id }: { id: string }) => {
	const { baseFolderUUID } = useSDKConfig()
	const routeParent = useRouteParent()
	const { dark } = useTheme()
	const location = useLocation()
	const { t } = useTranslation()
	const [lastSelectedNote] = useLocalStorage("lastSelectedNote", "")
	const [lastSelectedChatsConversation] = useLocalStorage("lastSelectedChatsConversation", "")
	const unread = useChatsStore(useCallback(state => state.unread, []))
	const requestsInCount = useContactsStore(useCallback(state => state.requestsInCount, []))

	const onClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
			if (id === "transfers") {
				e.preventDefault()

				eventEmitter.emit("openTransfers")
			}
		},
		[id]
	)

	const link = useMemo(() => {
		return {
			to:
				id === baseFolderUUID
					? "/drive/$"
					: id === "syncs"
						? "/syncs"
						: id === "mounts"
							? "/mounts/$type"
							: id === "notes"
								? lastSelectedNote.length > 0
									? "/notes/$uuid"
									: "/notes"
								: id === "chats"
									? lastSelectedChatsConversation.length > 0
										? "/chats/$uuid"
										: "/chats"
									: id === "settings"
										? "/settings/$type"
										: id === "contacts"
											? "/contacts/$type"
											: id === "terminal"
												? "/terminal"
												: "/",
			params:
				id === baseFolderUUID
					? {
							_splat: baseFolderUUID
						}
					: id === "settings"
						? {
								type: "general"
							}
						: id === "mounts"
							? {
									type: "virtual-drive"
								}
							: id === "contacts"
								? {
										type: requestsInCount > 0 ? "in" : "all"
									}
								: id === "notes" && lastSelectedNote.length > 0
									? { uuid: lastSelectedNote }
									: id === "chats" && lastSelectedChatsConversation.length > 0
										? { uuid: lastSelectedChatsConversation }
										: undefined
		}
	}, [id, baseFolderUUID, lastSelectedNote, lastSelectedChatsConversation, requestsInCount])

	const showIndicator = useMemo(() => {
		return (
			routeParent === id ||
			(id === baseFolderUUID && location.includes("/drive")) ||
			(id === "settings" && location.includes("settings")) ||
			(id === "notes" && location.includes("notes")) ||
			(id === "chats" && location.includes("chats")) ||
			(id === "contacts" && location.includes("contacts")) ||
			(id === "syncs" && location.includes("syncs")) ||
			(id === "mounts" && location.includes("mounts")) ||
			(id === "terminal" && location.includes("terminal"))
		)
	}, [id, routeParent, location, baseFolderUUID])

	return (
		<div
			className={cn(
				"flex flex-row justify-center items-center w-full",
				IS_DESKTOP ? (IS_APPLE_DEVICE ? "pl-[4px]" : "pl-[1px]") : ""
			)}
		>
			<TooltipProvider delayDuration={100}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<Link
							className={cn(
								"flex flex-row p-[8px] rounded-lg transition-colors items-center justify-center cursor-pointer font-semibold hover:text-primary",
								showIndicator && (dark ? "bg-secondary text-primary" : "bg-[lightgray] text-primary"),
								dark && !showIndicator && "text-muted-foreground"
							)}
							onClick={onClick}
							to={link.to}
							params={link.params}
							draggable={false}
						>
							{id === "syncs" && <SyncIndicator iconSize={iconSize} />}
							{id === "mounts" && <HardDrive size={iconSize} />}
							{id === baseFolderUUID && (
								<div
									style={{
										width: iconSize - 1,
										height: iconSize - 1
									}}
								>
									<LogoSVG color={dark ? "white" : "black"} />
								</div>
							)}
							{id === "notes" && <Notebook size={iconSize} />}
							{id === "chats" &&
								(unread > 0 ? (
									<>
										<MessageCircleMore
											size={iconSize}
											className="text-red-500"
										/>
									</>
								) : (
									<MessageCircle size={iconSize} />
								))}
							{id === "contacts" && (
								<Contact
									size={iconSize}
									className={requestsInCount > 0 ? "text-red-500" : undefined}
								/>
							)}
							{id === "settings" && <Settings size={iconSize} />}
							{id === "transfers" && <ArrowDownUp size={iconSize} />}
							{id === "transfers" && <TransfersProgress />}
							{id === "terminal" && <Terminal size={iconSize} />}
						</Link>
					</TooltipTrigger>
					<TooltipContent
						side="right"
						className="flex flex-row gap-2 items-center text-primary"
					>
						{id === "chats" && unread > 0 && (
							<div className="rounded-full bg-red-500 text-white flex flex-row items-center justify-center text-xs w-[16px] h-[16px]">
								{unread >= 9 ? "9+" : unread}
							</div>
						)}
						{id === "contacts" && requestsInCount > 0 && (
							<div className="rounded-full bg-red-500 text-white flex flex-row items-center justify-center text-xs w-[16px] h-[16px]">
								{requestsInCount >= 9 ? "9+" : requestsInCount}
							</div>
						)}
						<p>
							{id === baseFolderUUID && t("sideBar.cloudDrive")}
							{id === "syncs" && t("sideBar.syncs")}
							{id === "mounts" && t("sideBar.mounts")}
							{id === "notes" && t("sideBar.notes")}
							{id === "chats" && t("sideBar.chats")}
							{id === "contacts" && t("sideBar.contacts")}
							{id === "settings" && t("sideBar.settings")}
							{id === "transfers" && t("sideBar.transfers")}
							{id === "terminal" && t("sideBar.terminal")}
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
})

export default Button
