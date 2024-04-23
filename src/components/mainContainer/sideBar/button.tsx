import { memo, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { RefreshCcw, HardDrive, Notebook, MessageCircle, Contact, ArrowDownUp, Settings, MessageCircleMore } from "lucide-react"
import { Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { TOOLTIP_POPUP_DELAY, IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import TransfersProgress from "./transfersProgress"
import { useLocalStorage } from "@uidotdev/usehooks"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { useChatsStore } from "@/stores/chats.store"
import { SocketEvent } from "@filen/sdk"
import socket from "@/lib/socket"

const iconSize = 21

export const Button = memo(({ id }: { id: string }) => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()
	const theme = useTheme()
	const location = useLocation()
	const [hovering, setHovering] = useState<boolean>(false)
	const { t } = useTranslation()
	const [lastSelectedNote] = useLocalStorage("lastSelectedNote", "")
	const [lastSelectedChatsConversation] = useLocalStorage("lastSelectedChatsConversation", "")
	const { unread, setUnread } = useChatsStore()
	const unreadQueryLastUpdateRef = useRef<number>(0)

	const chatsUnreadCountQuery = useQuery({
		queryKey: ["chatsUnreadCount", id],
		queryFn: () => (id === "chats" ? worker.chatsUnreadCount() : Promise.resolve<number>(0))
	})

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
				id === sdkConfig.baseFolderUUID
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
											? "/contacts/online"
											: "/",
			params:
				id === sdkConfig.baseFolderUUID
					? {
							_splat: sdkConfig.baseFolderUUID
						}
					: id === "settings"
						? {
								type: "general"
							}
						: id === "contacts"
							? {
									type: "online"
								}
							: id === "notes" && lastSelectedNote.length > 0
								? { uuid: lastSelectedNote }
								: id === "chats" && lastSelectedChatsConversation.length > 0
									? { uuid: lastSelectedChatsConversation }
									: undefined
		}
	}, [id, sdkConfig.baseFolderUUID, lastSelectedNote, lastSelectedChatsConversation])

	const showIndicator = useMemo(() => {
		return (
			routeParent === id ||
			(id === sdkConfig.baseFolderUUID && location.includes("drive")) ||
			(id === "settings" && location.includes("settings")) ||
			(id === "notes" && location.includes("notes")) ||
			(id === "chats" && location.includes("chats")) ||
			(id === "contacts" && location.includes("contacts")) ||
			(id === "syncs" && location.includes("syncs")) ||
			(id === "mounts" && location.includes("mounts"))
		)
	}, [id, routeParent, location, sdkConfig.baseFolderUUID])

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			if (id !== "chats") {
				return
			}

			try {
				if (event.type === "chatMessageNew") {
					if (sdkConfig.userId !== event.data.senderId) {
						setUnread(prev => prev + 1)
					}
				} else if (event.type === "chatConversationDeleted") {
					await chatsUnreadCountQuery.refetch()
				}
			} catch (e) {
				console.error(e)
			}
		},
		[setUnread, chatsUnreadCountQuery, id, sdkConfig.userId]
	)

	useEffect(() => {
		const updateChatsUnreadCountListener = eventEmitter.on("updateChatsUnreadCount", () => {
			chatsUnreadCountQuery.refetch().catch(console.error)
		})

		return () => {
			updateChatsUnreadCountListener.remove()
		}
	}, [chatsUnreadCountQuery])

	useEffect(() => {
		if (chatsUnreadCountQuery.isSuccess && id === "chats" && unreadQueryLastUpdateRef.current !== chatsUnreadCountQuery.dataUpdatedAt) {
			unreadQueryLastUpdateRef.current = chatsUnreadCountQuery.dataUpdatedAt

			setUnread(chatsUnreadCountQuery.data)
		}
	}, [chatsUnreadCountQuery.isSuccess, chatsUnreadCountQuery.data, setUnread, id, chatsUnreadCountQuery.dataUpdatedAt])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	return (
		<div className={cn("flex flex-row justify-center items-center w-full", IS_DESKTOP ? "pl-[1px]" : "")}>
			{showIndicator && (
				<div className="w-[3px] h-10 bg-black dark:bg-white absolute left-[0px] rounded-tr-xl rounded-br-xl transition-all" />
			)}
			{hovering && (
				<div className="w-[3px] h-5 bg-black dark:bg-white absolute left-[0px] rounded-tr-xl rounded-br-xl transition-all" />
			)}
			<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<Link
							className="flex flex-row w-12 h-12 rounded-full transition-all items-center justify-center cursor-pointer bg-neutral-200 dark:bg-primary-foreground"
							onClick={onClick}
							onMouseEnter={() => setHovering(true)}
							onMouseLeave={() => setHovering(false)}
							to={link.to}
							params={link.params}
							draggable={false}
						>
							{id === "syncs" && <RefreshCcw size={iconSize} />}
							{id === "mounts" && <HardDrive size={iconSize} />}
							{id === sdkConfig.baseFolderUUID && (
								<img
									src={
										theme.dark
											? "https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
											: "https://drive.filen.io/static/media/dark_logo.41ab3ed5c0117abdb8e47d6bac43d9ae.svg"
									}
									className="w-5 h-5"
									draggable={false}
								/>
							)}
							{id === "notes" && <Notebook size={iconSize} />}
							{id === "chats" &&
								(unread > 0 ? (
									<MessageCircleMore
										size={iconSize}
										className="text-red-500"
									/>
								) : (
									<MessageCircle size={iconSize} />
								))}
							{id === "contacts" && <Contact size={iconSize} />}
							{id === "settings" && <Settings size={iconSize} />}
							{id === "transfers" && <ArrowDownUp size={iconSize} />}
							{id === "transfers" && <TransfersProgress />}
						</Link>
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>
							{id === sdkConfig.baseFolderUUID && t("sideBar.cloudDrive")}
							{id === "syncs" && t("sideBar.syncs")}
							{id === "mounts" && t("sideBar.mounts")}
							{id === "notes" && t("sideBar.notes")}
							{id === "chats" && t("sideBar.chats")}
							{id === "contacts" && t("sideBar.contacts")}
							{id === "settings" && t("sideBar.settings")}
							{id === "transfers" && t("sideBar.transfers")}
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
})

export default Button
