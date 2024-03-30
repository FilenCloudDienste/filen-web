import { memo, useState, useCallback, useMemo } from "react"
import Icon from "@/components/icon"
import { useRouterState, Link } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { TOOLTIP_POPUP_DELAY, IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import TransfersProgress from "./transfersProgress"

const iconSize = 20

export const Button = memo(({ id }: { id: string }) => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()
	const theme = useTheme()
	const routerState = useRouterState()
	const [hovering, setHovering] = useState<boolean>(false)
	const { t } = useTranslation()

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
						: id === "notes"
							? "/notes/$uuid"
							: id === "chats"
								? "/chats/$uuid"
								: id === "settings"
									? "/settings/$type"
									: id === "contacts"
										? "/contacts"
										: "/",
			params:
				id === sdkConfig.baseFolderUUID
					? {
							_splat: sdkConfig.baseFolderUUID
						}
					: id === "notes"
						? {
								uuid: "x"
							}
						: id === "chats"
							? {
									uuid: "x"
								}
							: id === "settings"
								? {
										type: "general"
									}
								: undefined
		}
	}, [id, sdkConfig.baseFolderUUID])

	return (
		<div className={`flex flex-row justify-center items-center w-full ${IS_DESKTOP ? "pl-[1px]" : ""}`}>
			{(routeParent === id ||
				(id === sdkConfig.baseFolderUUID && routerState.location.pathname.includes("/drive/")) ||
				(id === "settings" && routerState.location.pathname.includes("settings"))) && (
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
						>
							{id === "syncs" && (
								<Icon
									name="refresh-ccw"
									size={iconSize}
								/>
							)}
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
							{id === "notes" && (
								<Icon
									name="notebook"
									size={iconSize}
								/>
							)}
							{id === "chats" && (
								<Icon
									name="message-circle"
									size={iconSize}
								/>
							)}
							{id === "contacts" && (
								<Icon
									name="contact"
									size={iconSize}
								/>
							)}
							{id === "settings" && (
								<Icon
									name="settings"
									size={iconSize}
								/>
							)}
							{id === "transfers" && (
								<Icon
									name="arrow-down-up"
									size={iconSize}
								/>
							)}
							{id === "transfers" && <TransfersProgress />}
						</Link>
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>
							{id === sdkConfig.baseFolderUUID && t("sideBar.cloudDrive")}
							{id === "syncs" && t("sideBar.syncs")}
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
