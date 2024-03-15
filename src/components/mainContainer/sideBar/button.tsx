import { memo, useCallback, useState } from "react"
import { NotebookIcon, ContactIcon, MessageCircleIcon, SettingsIcon, RefreshCcwIcon, ArrowDownUpIcon } from "lucide-react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import useRouteParent from "@/hooks/useRouteParent"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { TOOLTIP_POPUP_DELAY, IS_DESKTOP } from "@/constants"
import eventEmitter from "@/lib/eventEmitter"
import { Flat as FlatCircularProgress } from "@alptugidin/react-circular-progress-bar"

const iconSize = 18

export const Button = memo(({ id }: { id: string }) => {
	const sdkConfig = useSDKConfig()
	const routeParent = useRouteParent()
	const { theme } = useTheme()
	const navigate = useNavigate()
	const routerState = useRouterState()
	const [hovering, setHovering] = useState<boolean>(false)
	const { t } = useTranslation()

	const navigateToId = useCallback(() => {
		if (id === sdkConfig.baseFolderUUID) {
			navigate({
				to: "/drive/$",
				params: {
					_splat: id
				}
			})

			return
		}

		if (id === "notes") {
			navigate({
				to: "/notes/$uuid",
				params: {
					uuid: id
				}
			})

			return
		}

		if (id === "chats") {
			navigate({
				to: "/chats/$uuid",
				params: {
					uuid: id
				}
			})

			return
		}

		if (id === "transfers") {
			eventEmitter.emit("openTransfers")

			return
		}

		if (id === "contacts") {
			navigate({
				to: "/contacts"
			})

			return
		}
	}, [id, sdkConfig.baseFolderUUID, navigate])

	return (
		<div className={`flex flex-row justify-center items-center w-full ${IS_DESKTOP ? "pl-[1px]" : ""}`}>
			{(routeParent === id || (id === sdkConfig.baseFolderUUID && routerState.location.pathname.includes("/drive/"))) && (
				<div className="w-[3px] h-10 bg-black dark:bg-white absolute left-[0px] rounded-tr-xl rounded-br-xl transition-all" />
			)}
			{hovering && (
				<div className="w-[3px] h-5 bg-black dark:bg-white absolute left-[0px] rounded-tr-xl rounded-br-xl transition-all" />
			)}
			<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<div
							className="flex flex-row w-12 h-12 rounded-full transition-all items-center justify-center cursor-pointer bg-neutral-200 dark:bg-primary-foreground"
							onClick={() => navigateToId()}
							onMouseEnter={() => setHovering(true)}
							onMouseLeave={() => setHovering(false)}
						>
							{id === "syncs" && <RefreshCcwIcon size={iconSize} />}
							{id === sdkConfig.baseFolderUUID && (
								<img
									src={
										theme === "dark"
											? "https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
											: "https://drive.filen.io/static/media/dark_logo.41ab3ed5c0117abdb8e47d6bac43d9ae.svg"
									}
									className="w-5 h-5"
								/>
							)}
							{id === "notes" && <NotebookIcon size={iconSize} />}
							{id === "chats" && <MessageCircleIcon size={iconSize} />}
							{id === "contacts" && <ContactIcon size={iconSize} />}
							{id === "settings" && <SettingsIcon size={iconSize} />}
							{id === "transfers" && <ArrowDownUpIcon size={iconSize} />}
							{id === "transfers" && (
								<div className="absolute w-[50px] h-[50px]">
									<FlatCircularProgress
										progress={10}
										showValue={false}
										sx={{
											strokeColor: "green",
											barWidth: 8,
											bgStrokeColor: "transparent",
											bgColor: { value: "#000000", transparency: "10" },
											shape: "full",
											strokeLinecap: "square",
											loadingTime: 1000,
											miniCircleSize: 0,
											intersectionEnabled: true
										}}
									/>
								</div>
							)}
						</div>
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
