import { memo, useCallback } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/themeProvider"
import { useTranslation } from "react-i18next"
import { showConfirmDialog } from "./dialogs/confirm"
import { Minus, Maximize, X } from "lucide-react"

export const WindowControls = memo(() => {
	const { dark } = useTheme()
	const [minimizeToTrayEnabled] = useLocalStorage<boolean>("minimizeToTrayEnabled", false)
	const { t } = useTranslation()

	const minimizeWindow = useCallback(async () => {
		try {
			if (minimizeToTrayEnabled) {
				await window.desktopAPI.hideWindow()

				return
			}

			await window.desktopAPI.minimizeWindow()
		} catch (e) {
			console.error(e)
		}
	}, [minimizeToTrayEnabled])

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
			if (minimizeToTrayEnabled) {
				await minimizeWindow().catch(() => {})

				return
			}

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
		[t, minimizeToTrayEnabled, minimizeWindow]
	)

	return (
		<>
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
		</>
	)
})

export default WindowControls
