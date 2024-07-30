import { memo, useMemo, useState, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSyncsStore } from "@/stores/syncs.store"
import { AlertCircle, RefreshCw, Pause, Play } from "lucide-react"
import Events from "./events"
import Ignored from "./ignored"
import Settings from "./settings"
import { useTranslation } from "react-i18next"
import Issues from "./issues"
import Transfers from "./transfers"
import { Button } from "@/components/ui/button"
import eventEmitter from "@/lib/eventEmitter"
import useDesktopConfig from "@/hooks/useDesktopConfig"

export const Content = memo(({ sync }: { sync: SyncPair }) => {
	const { cycleState, transfers, localIgnored, remoteIgnored, errors } = useSyncsStore()
	const { t } = useTranslation()
	const [activeTab, setActiveTab] = useState<string>("events")
	const [desktopConfig] = useDesktopConfig()

	const syncConfig = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs.filter(pair => pair.uuid === sync.uuid)[0] ?? null
	}, [sync.uuid, desktopConfig])

	const state = useMemo(() => {
		return {
			transfers: transfers[sync.uuid] ? transfers[sync.uuid]! : [],
			cycleState: cycleState[sync.uuid] ? cycleState[sync.uuid]! : "Starting",
			localIgnored: localIgnored[sync.uuid] ? localIgnored[sync.uuid]! : [],
			remoteIgnored: remoteIgnored[sync.uuid] ? remoteIgnored[sync.uuid]! : [],
			errors: errors[sync.uuid] ? errors[sync.uuid]! : [],
			ongoingTransfers: transfers[sync.uuid]
				? transfers[sync.uuid]!.filter(
						transfer => transfer.state === "queued" || transfer.state === "started" || transfer.state === "paused"
					)
				: []
		}
	}, [sync.uuid, cycleState, transfers, localIgnored, remoteIgnored, errors])

	const togglePause = useCallback(() => {
		eventEmitter.emit("toggleSyncPause", sync.uuid)
	}, [sync.uuid])

	return (
		<div className="flex flex-row w-full h-full select-none">
			<Tabs
				defaultValue="events"
				className="h-[calc(100dvh-88px)] w-full"
				onValueChange={setActiveTab}
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
						<TabsTrigger value="events">{t("syncs.eventsTitle")}</TabsTrigger>
						<TabsTrigger
							value="transfers"
							className="flex flex-row gap-1.5 items-center"
						>
							{state.ongoingTransfers.length > 0 && (
								<RefreshCw className="w-4 h-4 text-muted-foreground animate-spin-medium" />
							)}
							<p>{t("syncs.transfersTitle")}</p>
						</TabsTrigger>
						<TabsTrigger
							value="ignored"
							className="flex flex-row gap-1.5 items-center"
						>
							{state.localIgnored.length + state.remoteIgnored.length > 0 && (
								<AlertCircle className="w-4 h-4 text-muted-foreground" />
							)}
							<p>{t("syncs.ignoredTitle")}</p>
						</TabsTrigger>
						<TabsTrigger
							value="issues"
							className="flex flex-row gap-1.5 items-center"
						>
							{state.errors.length > 0 && <AlertCircle className="w-4 h-4 text-red-500" />}
							<p>{t("syncs.issuesTitle")}</p>
						</TabsTrigger>
						<TabsTrigger value="settings">{t("syncs.settingsTitle")}</TabsTrigger>
					</TabsList>
					{activeTab === "transfers" && syncConfig && state.ongoingTransfers.length > 0 && (
						<div
							className="flex flex-row items-center px-4 mt-4"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
						>
							<Button
								size="icon"
								variant="ghost"
								onClick={togglePause}
							>
								{syncConfig.paused ? (
									<Play
										size={20}
										className="text-muted-foreground"
									/>
								) : (
									<Pause
										size={20}
										className="text-muted-foreground"
									/>
								)}
							</Button>
						</div>
					)}
				</div>
				<TabsContent
					value="events"
					className="h-full w-full pt-3"
				>
					<Events sync={sync} />
				</TabsContent>
				<TabsContent
					value="transfers"
					className="h-full w-full pt-3"
				>
					<Transfers sync={sync} />
				</TabsContent>
				<TabsContent
					value="ignored"
					className="w-full h-full pt-3"
				>
					<Ignored sync={sync} />
				</TabsContent>
				<TabsContent
					value="issues"
					className="w-full h-full pt-3"
				>
					<Issues sync={sync} />
				</TabsContent>
				<TabsContent
					value="settings"
					className="w-full h-full pt-3"
				>
					<Settings sync={sync} />
				</TabsContent>
			</Tabs>
		</div>
	)
})

export default Content
