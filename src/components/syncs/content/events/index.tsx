import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore, type TransferDataWithTimestamp } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Event from "./event"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { CalendarClock, RefreshCw, CheckCircle, PauseCircle, XCircle, Pause, Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatBytes } from "@/utils"
import { bpsToReadable } from "@/components/transfers/utils"
import { Button } from "@/components/ui/button"
import eventEmitter from "@/lib/eventEmitter"

export const SyncInfo = memo(({ syncUUID, paused }: { syncUUID: string; paused: boolean }) => {
	const { speed, remainingReadable, tasksCount, tasksSize, cycleState, taskErrors } = useSyncsStore(
		useCallback(
			state => ({
				speed: state.speed[syncUUID] ? state.speed[syncUUID]! : 0,
				remainingReadable: state.remainingReadable[syncUUID] ? state.remainingReadable[syncUUID]! : 0,
				tasksCount: state.tasksCount[syncUUID] ? state.tasksCount[syncUUID]! : 0,
				tasksSize: state.tasksSize[syncUUID] ? state.tasksSize[syncUUID]! : 0,
				cycleState: state.cycleState[syncUUID] ? state.cycleState[syncUUID]! : "cycleRestarting",
				taskErrors: state.taskErrors[syncUUID] ? state.taskErrors[syncUUID]!.length : 0
			}),
			[syncUUID]
		)
	)
	const { t } = useTranslation()

	const togglePause = useCallback(() => {
		eventEmitter.emit("toggleSyncPause", syncUUID)
	}, [syncUUID])

	return (
		<div className="flex flex-row w-full px-4 pb-4">
			<div className="flex flex-row items-center h-10 bg-secondary rounded-sm w-full px-4 gap-4 justify-between">
				<div className="flex flex-row items-center gap-2 text-muted-foreground text-sm">
					{taskErrors > 0 ? (
						<>
							<XCircle
								className="text-red-500"
								size={16}
							/>
							<p>{t("syncs.info.taskErrors", { count: taskErrors })}</p>
							<p className="text-blue-500 hover:underline cursor-pointer">{t("syncs.info.taskErrorsResolve")}</p>
						</>
					) : paused ? (
						<>
							<PauseCircle
								className="text-primary"
								size={16}
							/>
							<p>{t("syncs.info.paused")}</p>
						</>
					) : (
						<>
							{cycleState === "cycleProcessingDeltasStarted" ? (
								<>
									<RefreshCw
										className="animate-spin-medium text-primary"
										size={16}
									/>
									<p>{t("syncs.info.processingDeltas")}</p>
								</>
							) : cycleState === "cycleProcessingTasksStarted" ? (
								<>
									<RefreshCw
										className="animate-spin-medium text-primary"
										size={16}
									/>
									<p>
										{tasksCount > 0 && tasksSize > 0
											? t("syncs.info.progress", {
													items: tasksCount,
													speed: bpsToReadable(speed),
													remaining: remainingReadable,
													total: formatBytes(tasksSize)
												})
											: t("syncs.info.syncingChanges")}
									</p>
								</>
							) : cycleState === "cycleApplyingStateStarted" || cycleState === "cycleSavingStateStarted" ? (
								<>
									<RefreshCw
										className="animate-spin-medium text-primary"
										size={16}
									/>
									<p>{t("syncs.info.savingState")}</p>
								</>
							) : (
								<>
									<CheckCircle
										className="text-green-500"
										size={16}
									/>
									<p>{t("syncs.info.upToDate")}</p>
								</>
							)}
						</>
					)}
				</div>
				{taskErrors === 0 && cycleState === "cycleProcessingTasksStarted" && (
					<div className="flex flex-row items-center gap-2">
						{paused ? (
							<Button
								size="icon"
								variant="default"
								className="h-7 w-7"
								onClick={togglePause}
							>
								<Play size={16} />
							</Button>
						) : (
							<Button
								size="icon"
								variant="destructive"
								className="h-7 w-7"
								onClick={togglePause}
							>
								<Pause size={16} />
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	)
})

export const Events = memo(({ sync }: { sync: SyncPair }) => {
	const events = useSyncsStore(
		useCallback(state => (state.transferEvents[sync.uuid] ? state.transferEvents[sync.uuid]! : []), [sync.uuid])
	)
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 13 - 40 - 16 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const getItemKey = useCallback((_: number, event: TransferDataWithTimestamp) => `${event.localPath}:${event.timestamp}`, [])

	const itemContent = useCallback((_: number, event: TransferDataWithTimestamp) => {
		return <Event event={event} />
	}, [])

	const virtuosoComponents = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="w-full h-full flex flex-col items-center justify-center gap-2">
						<CalendarClock
							size={72}
							className="text-muted-foreground"
						/>
						<p className="text-muted-foreground">{t("syncs.noEventsYet")}</p>
					</div>
				)
			}
		}
	}, [t])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	return (
		<div className="flex flex-col">
			<Virtuoso
				ref={virtuosoRef}
				data={events}
				totalCount={events.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				itemContent={itemContent}
				components={virtuosoComponents}
				defaultItemHeight={65}
				overscan={0}
				style={style}
			/>
			<SyncInfo
				syncUUID={sync.uuid}
				paused={sync.paused}
			/>
		</div>
	)
})

export default Events
