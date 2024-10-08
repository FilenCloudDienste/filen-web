import { memo } from "react"
import useAccount from "@/hooks/useAccount"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "react-i18next"
import { formatBytes } from "@/utils"
import { Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Link } from "@tanstack/react-router"
import Avatar from "@/components/avatar"
import { cn } from "@/lib/utils"
import useIsMobile from "@/hooks/useIsMobile"
import useLocation from "@/hooks/useLocation"

export const Bottom = memo(() => {
	const account = useAccount()
	const isMobile = useIsMobile()
	const { t } = useTranslation()
	const location = useLocation()

	return (
		<div className={cn("py-2 px-3 border-t flex flex-row h-12 flex-1 gap-4 w-full", !isMobile ? "justify-between" : "justify-center")}>
			{account && (
				<>
					<Link
						className="flex flex-row items-center justify-center"
						to="/settings/$type"
						params={{
							type: "account"
						}}
						draggable={false}
					>
						<Avatar
							src={account.account.avatarURL}
							size={28}
						/>
					</Link>
					{(!isMobile || (isMobile && (location.includes("notes") || location.includes("chats")))) && (
						<>
							<div className="flex flex-col gap-1.5 w-full justify-center">
								<Progress
									value={
										((account.account.storage >= account.account.maxStorage
											? account.account.maxStorage
											: account.account.storage) /
											account.account.maxStorage) *
										100
									}
									max={100}
									className="h-1.5"
								/>
								<p className="text-muted-foreground text-xs line-clamp-1 text-ellipsis break-all">
									{t("settings.general.used", {
										used: formatBytes(account.account.storage),
										max: formatBytes(account.account.maxStorage)
									})}
								</p>
							</div>
							<div className="flex flex-row items-center justify-center">
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<Link
												className="text-muted-foreground hover:text-primary hover:bg-secondary rounded-md p-1 cursor-pointer"
												to="/settings/$type"
												params={{
													type: account.account.didExportMasterKeys ? "general" : "security"
												}}
												draggable={false}
											>
												{!account.account.didExportMasterKeys && (
													<div className="absolute -mt-1.5 z-50 ml-3 bg-red-500 rounded-full w-4 h-4 flex flex-row items-center justify-center text-sm text-white uppercase">
														<p>!</p>
													</div>
												)}
												<Settings
													size={22}
													className={cn(!account.account.didExportMasterKeys && "text-red-500")}
												/>
											</Link>
										</TooltipTrigger>
										<TooltipContent side="top">
											<p>{t("innerSideBar.bottom.settings")}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</>
					)}
				</>
			)}
		</div>
	)
})

export default Bottom
