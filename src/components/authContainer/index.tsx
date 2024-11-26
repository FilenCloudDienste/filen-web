import { memo } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/themeProvider"
import LogoSVG from "@/assets/logo"
import { DESKTOP_TOPBAR_HEIGHT, IS_APPLE_DEVICE, IS_DESKTOP } from "@/constants"
import WindowControls from "../windowControls"

export const AuthContainer = memo(({ children }: { children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { dark } = useTheme()

	return (
		<div className="flex h-[100dvh] w-screen flex-col overflow-y-auto overflow-x-hidden">
			<div
				className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20 items-center"
				style={{
					// @ts-expect-error not typed
					WebkitAppRegion: "drag"
				}}
			>
				{IS_DESKTOP && !IS_APPLE_DEVICE && (
					<div
						className="flex flex-row absolute right-0 top-0 z-50"
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "no-drag",
							height: DESKTOP_TOPBAR_HEIGHT
						}}
					>
						<WindowControls />
					</div>
				)}
				<Link
					to="/login"
					className="flex shrink-0 flex-row justify-center items-center gap-2"
					draggable={false}
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "no-drag"
					}}
				>
					<div className="w-7 h-7 shrink-0">
						<LogoSVG color={dark ? "white" : "black"} />
					</div>
					<p className="font-medium text-2xl">Filen</p>
				</Link>
			</div>
			<div className="flex h-full flex-col items-center justify-center">
				<div className="flex flex-col p-8 w-80 sm:w-[420px]">{children}</div>
			</div>
			<div className="flex shrink-0 flex-row justify-center items-center py-10 gap-5">
				<a
					href="https://filen.io/terms"
					className="underline text-muted-foreground text-sm select-none"
					draggable={false}
					target="_blank"
				>
					{t("auth.footer.tos")}
				</a>
				<a
					href="https://filen.io/privacy"
					className="underline text-muted-foreground text-sm select-none"
					draggable={false}
					target="_blank"
				>
					{t("auth.footer.privacy")}
				</a>
			</div>
		</div>
	)
})

export default AuthContainer
