import { memo, useCallback, useMemo } from "react"
import { RefreshCcw, HardDrive, Notebook, MessageCircle, Contact, ArrowDownUp, Settings, MessageCircleMore, Terminal } from "lucide-react"
import { Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import TransfersProgress from "./transfersProgress"
import { useLocalStorage } from "@uidotdev/usehooks"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import { useChatsStore } from "@/stores/chats.store"
import { useContactsStore } from "@/stores/contacts.store"

const iconSize = 24

export const Button = memo(({ id }: { id: string }) => {
	const { baseFolderUUID } = useSDKConfig()
	const routeParent = useRouteParent()
	const theme = useTheme()
	const location = useLocation()
	const { t } = useTranslation()
	const [lastSelectedNote] = useLocalStorage("lastSelectedNote", "")
	const [lastSelectedChatsConversation] = useLocalStorage("lastSelectedChatsConversation", "")
	const { unread } = useChatsStore()
	const { requestsInCount } = useContactsStore()

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
						? "/drive/$"
						: id === "mounts"
							? "/drive/$"
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
			(id === baseFolderUUID && location.includes("drive")) ||
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
		<div className={cn("flex flex-row justify-center items-center w-full", IS_DESKTOP ? "pl-[1px]" : "")}>
			<TooltipProvider delayDuration={100}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<Link
							className={cn(
								"flex flex-row p-[8px] rounded-lg transition-colors items-center justify-center cursor-pointer font-semibold hover:text-primary",
								showIndicator && (theme.dark ? "bg-secondary text-primary" : "bg-[lightgray] text-primary"),
								theme.dark && !showIndicator && "text-muted-foreground"
							)}
							onClick={onClick}
							to={link.to}
							params={link.params}
							draggable={false}
						>
							{id === "syncs" && <RefreshCcw size={iconSize} />}
							{id === "mounts" && <HardDrive size={iconSize} />}
							{id === baseFolderUUID && (
								<img
									src={
										theme.dark
											? "https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
											: "https://drive.filen.io/static/media/dark_logo.41ab3ed5c0117abdb8e47d6bac43d9ae.svg"
									}
									className="w-[22px] h-[22px]"
									draggable={false}
								/>
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
