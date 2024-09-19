import { memo, useMemo, useCallback } from "react"
import { useSyncsStore } from "@/stores/syncs.store"
import { RefreshCw, CheckCircle, PauseCircle, XCircle, Pause, Play, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatBytes } from "@/utils"
import { bpsToReadable } from "@/components/transfers/utils"
import { Button } from "@/components/ui/button"
import eventEmitter from "@/lib/eventEmitter"
import { Progress } from "@/components/ui/progress"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { type CycleState } from "@filen/sync/dist/types"

export const SyncInfoProgress = memo(({ syncUUID }: { syncUUID: string }) => {
	const { tasksSize, tasksBytes } = useSyncsStore(
		useCallback(
			state => ({
				tasksSize: state.tasksSize[syncUUID] ? state.tasksSize[syncUUID]! : 0,
				tasksBytes: state.tasksBytes[syncUUID] ? state.tasksBytes[syncUUID]! : 0
			}),
			[syncUUID]
		)
	)

	const progressNormalized = useMemo(() => {
		return parseInt(((tasksBytes / tasksSize) * 100).toFixed(0))
	}, [tasksSize, tasksBytes])

	if (progressNormalized <= 0 || progressNormalized > 100 || tasksSize === 0) {
		return null
	}

	return (
		<Progress
			value={progressNormalized}
			max={100}
			className="h-[2px] w-full"
		/>
	)
})

export const SyncInfo = memo(({ syncUUID, paused }: { syncUUID: string; paused: boolean }) => {
	const { speed, remainingReadable, tasksCount, tasksSize, cycleState, setErrors, taskErrors, localTreeErrors } = useSyncsStore(
		useCallback(
			state => ({
				speed: state.speed[syncUUID] ? state.speed[syncUUID]! : 0,
				remainingReadable: state.remainingReadable[syncUUID] ? state.remainingReadable[syncUUID]! : 0,
				tasksCount: state.tasksCount[syncUUID] ? state.tasksCount[syncUUID]! : 0,
				tasksSize: state.tasksSize[syncUUID] ? state.tasksSize[syncUUID]! : 0,
				cycleState: state.cycleState[syncUUID]
					? state.cycleState[syncUUID]!
					: { state: "cycleRestarting" as CycleState, timestamp: Date.now() },
				taskErrors: state.errors[syncUUID] ? state.errors[syncUUID]!.filter(err => err.type === "task").length : 0,
				setErrors: state.setErrors,
				localTreeErrors: state.errors[syncUUID] ? state.errors[syncUUID]!.filter(err => err.type === "localTree").length : 0
			}),
			[syncUUID]
		)
	)
	const { t } = useTranslation()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const togglePause = useCallback(() => {
		eventEmitter.emit("toggleSyncPause", syncUUID)
	}, [syncUUID])

	const resetErrors = useCallback(async () => {
		if (localTreeErrors + taskErrors === 0) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("syncs.dialogs.resetErrors.title"),
				continueButtonText: t("syncs.dialogs.resetErrors.continue"),
				description: t("syncs.dialogs.resetErrors.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await Promise.all([
				window.desktopAPI.syncResetTaskErrors({
					uuid: syncUUID
				}),
				window.desktopAPI.syncResetLocalTreeErrors({
					uuid: syncUUID
				})
			])

			await window.desktopAPI.syncResetCache({
				uuid: syncUUID
			})

			setErrors(prev => ({
				...prev,
				[syncUUID]: []
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [syncUUID, errorToast, loadingToast, t, setErrors, localTreeErrors, taskErrors])

	return (
		<div className="flex flex-row w-full px-4 pb-4">
			<div className="flex flex-col h-10 bg-secondary rounded-sm w-full">
				<div className="flex flex-row h-full w-full items-center px-4 justify-between gap-4">
					<div className="flex flex-row h-full w-full items-center gap-2 text-sm text-ellipsis line-clamp-1 break-all">
						{taskErrors + localTreeErrors > 0 ? (
							<>
								<XCircle
									className="text-red-500"
									size={16}
								/>
								<p>{t("syncs.info.errors", { count: taskErrors + localTreeErrors })}</p>
								<p
									className="text-blue-500 hover:underline cursor-pointer"
									onClick={resetErrors}
								>
									{t("syncs.info.errorsResolve")}
								</p>
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
								{cycleState.state === "cycleProcessingDeltasStarted" ? (
									<>
										<RefreshCw
											className="animate-spin-medium text-primary"
											size={16}
										/>
										<p>{t("syncs.info.processingDeltas")}</p>
									</>
								) : cycleState.state === "cycleLocalSmokeTestFailed" ? (
									<>
										<AlertCircle
											className="text-red-500"
											size={16}
										/>
										<p>{t("syncs.info.localSmokeTestFailed")}</p>
									</>
								) : cycleState.state === "cycleRemoteSmokeTestFailed" ? (
									<>
										<AlertCircle
											className="text-red-500"
											size={16}
										/>
										<p>{t("syncs.info.remoteSmokeTestFailed")}</p>
									</>
								) : cycleState.state === "cycleWaitingForLocalDirectoryChangesStarted" ? (
									<>
										<RefreshCw
											className="animate-spin-medium text-primary"
											size={16}
										/>
										<p>{t("syncs.info.waitingForLocalDirectoryChanges")}</p>
									</>
								) : cycleState.state === "cycleGettingTreesStarted" ? (
									<>
										<RefreshCw
											className="animate-spin-medium text-primary"
											size={16}
										/>
										<p>{t("syncs.info.gettingTrees")}</p>
									</>
								) : cycleState.state === "cycleAcquiringLockStarted" ? (
									<>
										<RefreshCw
											className="animate-spin-medium text-primary"
											size={16}
										/>
										<p>{t("syncs.info.acquiringLock")}</p>
									</>
								) : cycleState.state === "cycleProcessingTasksStarted" ? (
									<>
										<RefreshCw
											className="animate-spin-medium text-primary"
											size={16}
										/>
										<p>
											{tasksCount > 0 && tasksSize > 0
												? speed > 0
													? t("syncs.info.progress", {
															items: tasksCount,
															speed: bpsToReadable(speed),
															remaining: remainingReadable,
															total: formatBytes(tasksSize)
														})
													: t("syncs.info.progressNoEstimate", {
															items: tasksCount,
															total: formatBytes(tasksSize)
														})
												: t("syncs.info.syncingChanges")}
										</p>
									</>
								) : cycleState.state === "cycleApplyingStateStarted" || cycleState.state === "cycleSavingStateStarted" ? (
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
					{taskErrors + localTreeErrors === 0 && cycleState.state === "cycleProcessingTasksStarted" && (
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
				<SyncInfoProgress syncUUID={syncUUID} />
			</div>
		</div>
	)
})

export default SyncInfo
