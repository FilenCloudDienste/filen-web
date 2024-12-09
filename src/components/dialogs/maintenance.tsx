import { memo, useCallback, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import { useRemoteConfigStore } from "@/stores/remoteConfig.store"
import { Unplug } from "lucide-react"
import { useMiscStore } from "@/stores/misc.store"

export const MaintenanceDialog = memo(() => {
	const { t } = useTranslation()
	const maintenanceActive = useRemoteConfigStore(useCallback(state => (state.config ? state.config.maintenance : false), []))
	const setMaintenanceDialogOpen = useMiscStore(useCallback(state => state.setMaintenanceDialogOpen, []))

	const onEscapeKeyDown = useCallback((e: KeyboardEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	useEffect(() => {
		setMaintenanceDialogOpen(maintenanceActive)
	}, [maintenanceActive, setMaintenanceDialogOpen])

	return (
		<Dialog open={maintenanceActive}>
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
					<p className="line-clamp-1 text-ellipsis break-before-all mb-1 text-xl">{t("maintenance.title")}</p>
					<p className="line-clamp-1 text-ellipsis break-before-all text-sm text-muted-foreground">{t("maintenance.info")}</p>
					<p className="line-clamp-1 text-ellipsis break-before-all text-sm text-muted-foreground">{t("maintenance.infoSub")}</p>
				</div>
			</DialogContent>
		</Dialog>
	)
})

export default MaintenanceDialog
