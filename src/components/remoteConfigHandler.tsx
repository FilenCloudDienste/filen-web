import { memo, useEffect, useRef, useCallback, useMemo } from "react"
import worker from "@/lib/worker"
import { useRemoteConfigStore } from "@/stores/remoteConfig.store"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { useTranslation } from "react-i18next"
import useIsMobile from "@/hooks/useIsMobile"
import { type RemoteConfigAnnouncement } from "@/types"
import { useLocalStorage } from "@uidotdev/usehooks"

export const Announcement = memo(
	({
		announcement,
		setDismissedAnnouncements
	}: {
		announcement: RemoteConfigAnnouncement
		setDismissedAnnouncements: React.Dispatch<React.SetStateAction<string[]>>
	}) => {
		const { t } = useTranslation()
		const isMobile = useIsMobile()

		const dismiss = useCallback(() => {
			setDismissedAnnouncements(prev => [...prev, announcement.uuid])
		}, [announcement.uuid, setDismissedAnnouncements])

		return (
			<div className={cn("z-50 flex flex-row absolute bottom-4", !isMobile ? "right-4" : "w-full px-4")}>
				<div className="flex flex-row gap-4 p-4 bg-background border rounded-sm">
					<div className="flex flex-row max-w-72">
						<p>{announcement.message}</p>
					</div>
					<div className="flex flex-col gap-2 justify-center">
						<Button
							size="sm"
							onClick={dismiss}
						>
							{t("announcements.gotIt")}
						</Button>
					</div>
				</div>
			</div>
		)
	}
)

export const RemoteConfigHandler = memo(() => {
	const isGettingConfig = useRef<boolean>(false)
	const { setConfig, config } = useRemoteConfigStore(useCallback(state => ({ config: state.config, setConfig: state.setConfig }), []))
	const [dismissedAnnouncements, setDismissedAnnouncements] = useLocalStorage<string[]>("dismissedAnnouncements", [])

	const getConfig = useCallback(async () => {
		if (isGettingConfig.current) {
			return
		}

		isGettingConfig.current = true

		try {
			const config = await worker.cdnConfig()

			setConfig(config)
		} catch (e) {
			console.error(e)
		} finally {
			isGettingConfig.current = false
		}
	}, [setConfig])

	const announcementsToShow = useMemo(() => {
		if (!config) {
			return []
		}

		return config.announcements
			.filter(
				announcement =>
					announcement.active &&
					(announcement.platforms.includes("web") || announcement.platforms.includes("all")) &&
					!dismissedAnnouncements.includes(announcement.uuid)
			)
			.slice(0, 1)
	}, [config, dismissedAnnouncements])

	useEffect(() => {
		getConfig()

		const interval = setInterval(getConfig, 30000)

		return () => {
			clearInterval(interval)
		}
	}, [getConfig])

	if (!config || announcementsToShow.length === 0) {
		return null
	}

	return announcementsToShow.map(announcement => {
		return (
			<Announcement
				announcement={announcement}
				key={announcement.uuid}
				setDismissedAnnouncements={setDismissedAnnouncements}
			/>
		)
	})
})

export default RemoteConfigHandler
