import { memo, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useTheme } from "@/providers/themeProvider"
import LogoSVG from "@/assets/logo"
import { cn } from "@/lib/utils"
import { showConfirmDialog } from "../dialogs/confirm"
import { Minus, Maximize, X } from "lucide-react"
import { DESKTOP_TOPBAR_HEIGHT, IS_APPLE_DEVICE, IS_DESKTOP } from "@/constants"

export const AuthContainer = memo(({ children }: { children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { dark } = useTheme()

	const minimizeWindow = useCallback(async () => {
		try {
			await window.desktopAPI.minimizeWindow()
		} catch (e) {
			console.error(e)
		}
	}, [])

	const maximizeWindow = useCallback(async () => {
		try {
			if (await window.desktopAPI.isWindowMaximized()) {
				await window.desktopAPI.unmaximizeWindow()

				return
			}

			await window.desktopAPI.maximizeWindow()
		} catch (e) {
			console.error(e)
		}
	}, [])

	const closeWindow = useCallback(
		async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			if (!e.shiftKey) {
				if (
					!(await showConfirmDialog({
						title: t("desktop.dialogs.close.title"),
						continueButtonText: t("desktop.dialogs.close.continue"),
						description: t("desktop.dialogs.close.description"),
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			window.desktopAPI.closeWindow().catch(console.error)
		},
		[t]
	)

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
						<div
							className={cn(
								"w-auto px-2 z-10 cursor-pointer text-muted-foreground h-full flex flex-row items-center justify-center hover:text-primary",
								dark ? "hover:bg-secondary" : "hover:bg-[lightgray]"
							)}
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
							onClick={minimizeWindow}
						>
							<Minus size={15} />
						</div>
						<div
							className={cn(
								"w-auto px-2 z-10 cursor-pointer text-muted-foreground h-full flex flex-row items-center justify-center hover:text-primary",
								dark ? "hover:bg-secondary" : "hover:bg-[lightgray]"
							)}
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
							onClick={maximizeWindow}
						>
							<Maximize size={13} />
						</div>
						<div
							className="w-auto px-2 z-10 cursor-pointer text-muted-foreground h-full flex flex-row items-center justify-center hover:bg-red-600 hover:text-white"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
							onClick={closeWindow}
						>
							<X size={15} />
						</div>
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
