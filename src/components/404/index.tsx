import { memo } from "react"
import { Link } from "@tanstack/react-router"
import LogoSVG from "@/assets/logo"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/themeProvider"
import { ArrowLeftCircle } from "lucide-react"
import { Button } from "../ui/button"
import useSDKConfig from "@/hooks/useSDKConfig"
import useIsAuthed from "@/hooks/useIsAuthed"

export const Page404 = memo(() => {
	const { dark } = useTheme()
	const { t } = useTranslation()
	const [authed] = useIsAuthed()
	const sdkConfig = useSDKConfig()

	return (
		<div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
			<header className="fixed top-0 left-0 w-full h-12 bg-transparent data-[draggable=true]:WebkitAppRegion-drag invisible" />
			<div className="mx-auto max-w-md text-center">
				<div className="mx-auto h-20 w-20 text-primary shrink-0 mb-10">
					<LogoSVG color={dark ? "white" : "black"} />
				</div>
				<h1 className="mt-4 text-6xl font-bold tracking-tight text-foreground sm:text-7xl">404</h1>
				<p className="mt-4 text-lg text-muted-foreground">{t("404.info")}</p>
				<div className="mt-6">
					<Link
						to={authed && sdkConfig ? "/drive/$" : "/"}
						params={
							authed && sdkConfig
								? {
										_splat: sdkConfig.baseFolderUUID
									}
								: undefined
						}
					>
						<Button className="gap-2">
							<ArrowLeftCircle size={16} />
							{t("404.btn")}
						</Button>
					</Link>
				</div>
			</div>
		</div>
	)
})

export default Page404
