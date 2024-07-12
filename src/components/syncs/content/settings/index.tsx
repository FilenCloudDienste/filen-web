import { memo, useCallback, useMemo } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import Section from "@/components/settings/section"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import eventEmitter from "@/lib/eventEmitter"

export const Settings = memo(({ sync }: { sync: SyncPair }) => {
	const [desktopConfig] = useDesktopConfig()
	const { t } = useTranslation()

	const syncConfig = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs.filter(pair => pair.uuid === sync.uuid)[0] ?? null
	}, [sync.uuid, desktopConfig])

	const togglePause = useCallback(() => {
		eventEmitter.emit("toggleSyncPause", sync.uuid)
	}, [sync.uuid])

	const deleteSync = useCallback(async () => {
		eventEmitter.emit("deleteSync", sync.uuid)
	}, [sync.uuid])

	return (
		<div className="flex flex-col px-4 pt-4 gap-4">
			<Section
				name={t("syncs.settings.sections.pause.name")}
				info={t("syncs.settings.sections.pause.info")}
			>
				<Switch
					checked={syncConfig ? syncConfig.paused : false}
					onCheckedChange={togglePause}
				/>
			</Section>
			<Section
				name={t("syncs.settings.sections.delete.name")}
				info={t("syncs.settings.sections.delete.info")}
			>
				<p
					className="text-red-500 underline cursor-pointer"
					onClick={deleteSync}
				>
					{t("syncs.settings.sections.delete.delete")}
				</p>
			</Section>
		</div>
	)
})

export default Settings
