import { memo, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSyncsStore } from "@/stores/syncs.store"
import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

export const TabsTriggers = memo(({ sync }: { sync: SyncPair }) => {
	const { localIgnored, remoteIgnored, errors } = useSyncsStore(
		useCallback(
			state => ({
				localIgnored: state.localIgnored[sync.uuid] ? (state.localIgnored[sync.uuid] ?? []).length > 0 : false,
				remoteIgnored: state.remoteIgnored[sync.uuid] ? (state.remoteIgnored[sync.uuid] ?? []).length > 0 : false,
				errors: state.errors[sync.uuid] ? (state.errors[sync.uuid] ?? []).length > 0 : false
			}),
			[sync.uuid]
		)
	)
	const { t } = useTranslation()

	return (
		<div
			className="flex flex-row items-center justify-between gap-4"
			style={{
				// @ts-expect-error not typed
				WebkitAppRegion: "drag"
			}}
		>
			<TabsList
				className="mx-4 mt-4"
				style={{
					// @ts-expect-error not typed
					WebkitAppRegion: "no-drag"
				}}
			>
				<TabsTrigger value="events">{t("syncs.eventsTitle")}</TabsTrigger>
				<TabsTrigger
					value="ignored"
					className="flex flex-row gap-1.5 items-center"
				>
					{(localIgnored || remoteIgnored) && <AlertCircle className="w-4 h-4 text-muted-foreground" />}
					<p>{t("syncs.ignoredTitle")}</p>
				</TabsTrigger>
				<TabsTrigger
					value="issues"
					className="flex flex-row gap-1.5 items-center"
				>
					{errors && <AlertCircle className="w-4 h-4 text-red-500" />}
					<p>{t("syncs.issuesTitle")}</p>
				</TabsTrigger>
				<TabsTrigger value="settings">{t("syncs.settingsTitle")}</TabsTrigger>
			</TabsList>
		</div>
	)
})

export default TabsTriggers
