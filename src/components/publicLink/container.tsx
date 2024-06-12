import { memo, useMemo, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import { useLocalStorage } from "@uidotdev/usehooks"
import useIsMobile from "@/hooks/useIsMobile"
import { IS_DESKTOP } from "@/constants"
import { Loader, Shield, Lock, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { cn } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import useWindowSize from "@/hooks/useWindowSize"
import { useTranslation } from "react-i18next"
import ReportDialog from "./reportDialog"
import eventEmitter from "@/lib/eventEmitter"

export const Container = memo(({ children, loading, hasInfo }: { children: React.ReactNode; loading: boolean; hasInfo: boolean }) => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const isMobile = useIsMobile()
	const urlState = usePublicLinkURLState()
	const location = useLocation()
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const widths = useMemo(() => {
		const sideBar = isMobile ? 0 : windowSize.width > 1200 ? 350 : 250

		return {
			sideBar,
			container: windowSize.width - sideBar
		}
	}, [isMobile, windowSize.width])

	const report = useCallback(() => {
		eventEmitter.emit("openReportDialog")
	}, [])

	return (
		<div className={cn("flex flex-row w-screen h-[100dvh] select-none", urlState.color && `bg-[#${urlState.color}]`)}>
			{!isMobile && !IS_DESKTOP && !urlState.embed && (
				<div
					className={cn(
						"flex flex-col border-r p-10 justify-center shrink-0 z-50 bg-background",
						location.includes("/d/") && "dragselect-start-allowed"
					)}
					style={{
						width: widths.sideBar
					}}
				>
					<div className="absolute top-10 left-10">
						<Link
							to={authed ? "/" : "login"}
							className="flex shrink-0 flex-row items-center gap-2"
							draggable={false}
						>
							<img
								src="https://drive.filen.io/static/media/light_logo.9f8ed143e54adb31009008c527f52c95.svg"
								className="w-6 h-6"
								draggable={false}
							/>
							<p className="font-medium text-2xl">Filen</p>
						</Link>
					</div>
					<div className="flex flex-col">
						<p className="text-muted-foreground uppercase">{t("publicLink.sideBar.ad.header")}</p>
						<p className="text-3xl">{t("publicLink.sideBar.ad.title")}</p>
					</div>
					<div className="flex flex-col mt-8 gap-3">
						<div className="flex flex-row gap-2">
							<Shield size={22} />
							<p>{t("publicLink.sideBar.ad.info1")}</p>
						</div>
						<div className="flex flex-row gap-2">
							<Lock size={22} />
							<p>{t("publicLink.sideBar.ad.info2")}</p>
						</div>
						<div className="flex flex-row gap-2">
							<EyeOff size={22} />
							<p>{t("publicLink.sideBar.ad.info3")}</p>
						</div>
					</div>
					<Link
						to={authed ? "/" : "login"}
						className="shrink-0 w-full mt-8"
						draggable={false}
					>
						<Button className="w-full">{t("publicLink.sideBar.ad.cta")}</Button>
					</Link>
				</div>
			)}
			<div
				className="flex flex-row bg-muted/40"
				style={{
					width: widths.container
				}}
			>
				{!urlState.embed && hasInfo && (
					<div className="absolute bottom-4 right-4 z-50">
						<Button
							variant="secondary"
							className="items-center gap-2"
							onClick={report}
						>
							<AlertCircle size={16} />
							{t("publicLink.sideBar.reportAbuse")}
						</Button>
					</div>
				)}
				{loading ? (
					<div className="flex flex-col w-full h-full items-center justify-center">
						<Loader
							size={32}
							className="animate-spin-medium"
						/>
					</div>
				) : (
					children
				)}
			</div>
			{!urlState.embed && <ReportDialog />}
		</div>
	)
})

export default Container
