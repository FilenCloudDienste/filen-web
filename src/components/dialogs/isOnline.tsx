import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import { Unplug } from "lucide-react"

export const IsOnlineDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(!window.navigator.onLine)
	const { t } = useTranslation()
	const isPinging = useRef<boolean>(false)

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

	useEffect(() => {
		ping()

		const interval = setInterval(ping, 15000)

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
