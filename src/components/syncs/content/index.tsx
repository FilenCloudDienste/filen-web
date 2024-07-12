import { memo, useMemo } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSyncsStore } from "@/stores/syncs.store"
import { AlertCircle } from "lucide-react"
import Events from "./events"
import Ignored from "./ignored"
import Settings from "./settings"
import { useTranslation } from "react-i18next"
import Issues from "./issues"

export const Content = memo(({ sync }: { sync: SyncPair }) => {
	const { cycleState, transfers, localIgnored, remoteIgnored, errors } = useSyncsStore()
	const { t } = useTranslation()

	const state = useMemo(() => {
		return {
			transfers: transfers[sync.uuid] ? transfers[sync.uuid]! : [],
			cycleState: cycleState[sync.uuid] ? cycleState[sync.uuid]! : "Starting",
			localIgnored: localIgnored[sync.uuid] ? localIgnored[sync.uuid]! : [],
			remoteIgnored: remoteIgnored[sync.uuid] ? remoteIgnored[sync.uuid]! : [],
			errors: errors[sync.uuid] ? errors[sync.uuid]! : []
		}
	}, [sync.uuid, cycleState, transfers, localIgnored, remoteIgnored, errors])

	return (
		<div className="flex flex-row w-full h-full select-none">
			<Tabs
				defaultValue="events"
				className="h-[calc(100dvh-88px)] w-full"
			>
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
						<TabsTrigger value="events">{t("syncs.events")}</TabsTrigger>
						<TabsTrigger
							value="ignored"
							className="flex flex-row gap-1.5 items-center"
						>
							{state.localIgnored.length + state.remoteIgnored.length > 0 && (
								<AlertCircle className="w-4 h-4 text-orange-500" />
							)}
							<p>{t("syncs.ignored")}</p>
						</TabsTrigger>
						<TabsTrigger
							value="issues"
							className="flex flex-row gap-1.5 items-center"
						>
							{state.errors.length > 0 && <AlertCircle className="w-4 h-4 text-red-500" />}
							<p>{t("syncs.issues")}</p>
						</TabsTrigger>
						<TabsTrigger value="settings">{t("syncs.settingsTitle")}</TabsTrigger>
					</TabsList>
					<div className="flex flex-row items-center px-4">{state.cycleState}</div>
				</div>
				<TabsContent
					value="events"
					className="h-full w-full"
				>
					<Events sync={sync} />
				</TabsContent>
				<TabsContent
					value="ignored"
					className="w-full h-full"
				>
					<Ignored sync={sync} />
				</TabsContent>
				<TabsContent
					value="issues"
					className="w-full h-full"
				>
					<Issues sync={sync} />
				</TabsContent>
				<TabsContent
					value="settings"
					className="w-full h-full"
				>
					<Settings sync={sync} />
				</TabsContent>
			</Tabs>
		</div>
	)
})

export default Content
