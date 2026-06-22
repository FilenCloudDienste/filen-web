import { memo, useMemo } from "react"
import useAccount from "@/hooks/useAccount"
import { Progress } from "@/components/ui/progress"
import { useTranslation } from "react-i18next"
import { formatBytes } from "@/utils"
import { Settings, Undo2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Link } from "@tanstack/react-router"
import Avatar from "@/components/avatar"
import { cn } from "@/lib/utils"
import useIsMobile from "@/hooks/useIsMobile"
import useLocation from "@/hooks/useLocation"
import { subscriptionWithdrawalEligible } from "@/lib/api/withdrawal"

export const Bottom = memo(() => {
	const account = useAccount()
	const isMobile = useIsMobile()
	const { t } = useTranslation()
	const location = useLocation()

	const showDetails = !isMobile || (isMobile && (location.includes("notes") || location.includes("chats")))

	// § 356a BGB: a persistent, easily accessible withdrawal entry point reachable from every screen,
	// shown only while a subscription is inside its 14 day withdrawal window. It links to the labelled
	// "Vertrag widerrufen" button + confirmation page in the subscriptions settings.
	const hasEligibleWithdrawal = useMemo(() => {
		if (!account) {
			return false
		}

		return account.account.subs.some(subscriptionWithdrawalEligible)
	}, [account])

	return (
		<div className={cn("py-2 px-3 border-t flex flex-row h-12 flex-1 gap-4 w-full", !isMobile ? "justify-between" : "justify-center")}>
			{account && (
				<>
					<Link
						className="flex flex-row items-center justify-center shrink-0"
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
					{showDetails && (
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
					)}
					{(hasEligibleWithdrawal || showDetails) && (
						<div className="flex flex-row items-center justify-center gap-1 shrink-0">
							{hasEligibleWithdrawal && (
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<Link
												className="text-amber-600/90 dark:text-amber-500/90 border border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 rounded-md p-1 cursor-pointer transition-colors"
												to="/settings/$type"
												params={{
													type: "subscriptions"
												}}
												draggable={false}
											>
												<Undo2 size={20} />
											</Link>
										</TooltipTrigger>
										<TooltipContent side="top">
											<p>{t("settings.withdrawal.button")}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
							{showDetails && (
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
							)}
						</div>
					)}
				</>
			)}
		</div>
	)
})

export default Bottom
