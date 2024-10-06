import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import { Unplug, Minus, Maximize, X } from "lucide-react"
import { IS_DESKTOP, IS_APPLE_DEVICE, DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { showConfirmDialog } from "./confirm"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/themeProvider"

export const IsOnlineDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(!window.navigator.onLine)
	const { t } = useTranslation()
	const isPinging = useRef<boolean>(false)
	const { dark } = useTheme()

	const onEscapeKeyDown = useCallback((e: KeyboardEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const ping = useCallback(async () => {
		if (isPinging.current) {
			return
		}

		isPinging.current = true

		try {
			if (!window.navigator.onLine) {
				setOpen(true)

				return
			}

			const isOnline = await worker.pingAPI()

			setOpen(!isOnline)
		} catch (e) {
			console.error(e)

			setOpen(true)
		} finally {
			isPinging.current = false
		}
	}, [])

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

	useEffect(() => {
		ping()

		const interval = setInterval(ping, 60000)

		const navigatorListener = () => {
			ping()
		}

		window.addEventListener("online", navigatorListener)
		window.addEventListener("offline", navigatorListener)

		return () => {
			clearInterval(interval)

			window.removeEventListener("online", navigatorListener)
			window.removeEventListener("offline", navigatorListener)
		}
	}, [ping])

	return (
		<Dialog open={open}>
			<DialogContent
				className="fullscreen-dialog no-close-button outline-none focus:outline-none active:outline-none hover:outline-none bg-background flex flex-row items-center justify-center select-none"
				onEscapeKeyDown={onEscapeKeyDown}
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
				<div className="flex flex-col items-center p-10">
					<Unplug
						size={100}
						className="mb-4 animate-pulse"
					/>
					<p className="line-clamp-1 text-ellipsis break-before-all mb-1 text-xl">{t("isOnline.title")}</p>
					<p className="line-clamp-1 text-ellipsis break-before-all text-sm text-muted-foreground">{t("isOnline.info")}</p>
					<p className="line-clamp-1 text-ellipsis break-before-all text-sm text-muted-foreground">{t("isOnline.infoSub")}</p>
				</div>
			</DialogContent>
		</Dialog>
	)
})

export default IsOnlineDialog
