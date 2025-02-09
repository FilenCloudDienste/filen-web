import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import { Unplug } from "lucide-react"
import { IS_DESKTOP, IS_APPLE_DEVICE, DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import useDriveURLState from "@/hooks/useDriveURLState"
import WindowControls from "../windowControls"
import { useMiscStore } from "@/stores/misc.store"

export const IsOnlineDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(!window.navigator.onLine)
	const { t } = useTranslation()
	const isPinging = useRef<boolean>(false)
	const { publicLink } = useDriveURLState()
	const setIsOnlineDialogOpen = useMiscStore(useCallback(state => state.setIsOnlineDialogOpen, []))
	const maintenanceDialogOpen = useMiscStore(useCallback(state => state.maintenanceDialogOpen, []))
	const lockDialogOpen = useMiscStore(useCallback(state => state.lockDialogOpen, []))

	const onEscapeKeyDown = useCallback((e: KeyboardEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const ping = useCallback(async (skipIsPingingCheck: boolean = false) => {
		if (isPinging.current && !skipIsPingingCheck) {
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

	useEffect(() => {
		setIsOnlineDialogOpen(open)
	}, [open, setIsOnlineDialogOpen])

	useEffect(() => {
		ping()

		const interval = setInterval(ping, 180000)

		const navigatorListener = () => {
			ping(false)
		}

		const immediateNavigatorListener = () => {
			ping(true)
		}

		window.addEventListener("online", navigatorListener)
		window.addEventListener("offline", navigatorListener)
		window.addEventListener("focus", immediateNavigatorListener)

		return () => {
			clearInterval(interval)

			window.removeEventListener("online", navigatorListener)
			window.removeEventListener("offline", navigatorListener)
			window.removeEventListener("focus", immediateNavigatorListener)
		}
	}, [ping])

	if (publicLink) {
		return null
	}

	return (
		<Dialog open={open && !maintenanceDialogOpen && !lockDialogOpen}>
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
						<WindowControls />
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
