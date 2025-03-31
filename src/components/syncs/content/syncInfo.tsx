import { memo, useMemo, useCallback } from "react"
import { useSyncsStore } from "@/stores/syncs.store"
import { RefreshCw, CheckCircle, PauseCircle, XCircle, Pause, Play, AlertCircle, Trash2 } from "lucide-react"
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
				tasksSize: state.tasksSize[syncUUID] ?? 0,
				tasksBytes: state.tasksBytes[syncUUID] ?? 0
			}),
			[syncUUID]
		)
	)

	const progressNormalized = useMemo(() => {
		return parseFloat(((tasksBytes / tasksSize) * 100).toFixed(2))
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
	const {
		speed,
		remainingReadable,
		tasksCount,
		tasksSize,
		cycleState,
		setErrors,
		taskErrors,
		localTreeErrors,
		confirmDeletion,
		setConfirmDeletion
	} = useSyncsStore(
		useCallback(
			state => ({
				speed: state.speed[syncUUID] ?? 0,
				remainingReadable: state.remainingReadable[syncUUID] ?? 0,
				tasksCount: state.tasksCount[syncUUID] ?? 0,
				tasksSize: state.tasksSize[syncUUID] ?? 0,
				cycleState: state.cycleState[syncUUID] ?? {
					state: "cycleRestarting" as CycleState,
					timestamp: Date.now()
				},
				taskErrors: state.errors[syncUUID] ? (state.errors[syncUUID] ?? []).filter(err => err.type === "task").length : 0,
				setErrors: state.setErrors,
				localTreeErrors: state.errors[syncUUID] ? (state.errors[syncUUID] ?? []).filter(err => err.type === "localTree").length : 0,
				confirmDeletion: state.confirmDeletion[syncUUID] ?? null,
				setConfirmDeletion: state.setConfirmDeletion
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

	const confirmDel = useCallback(async () => {
		if (!confirmDeletion) {
			return
		}

		if (
			!(await showConfirmDialog({
				title:
					confirmDeletion.where === "both"
						? t("syncs.dialogs.confirmDeletionBoth.title")
						: confirmDeletion.where === "local"
							? t("syncs.dialogs.confirmDeletionLocal.title")
							: t("syncs.dialogs.confirmDeletionRemote.title"),
				continueButtonText:
					confirmDeletion.where === "both"
						? t("syncs.dialogs.confirmDeletionBoth.continue")
						: confirmDeletion.where === "local"
							? t("syncs.dialogs.confirmDeletionLocal.continue")
							: t("syncs.dialogs.confirmDeletionRemote.continue"),
				description:
					confirmDeletion.where === "both"
						? t("syncs.dialogs.confirmDeletionBoth.description", { count: confirmDeletion.previous })
						: confirmDeletion.where === "local"
							? t("syncs.dialogs.confirmDeletionLocal.description", { count: confirmDeletion.previous })
							: t("syncs.dialogs.confirmDeletionRemote.description", { count: confirmDeletion.previous }),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await window.desktopAPI.syncUpdateConfirmDeletion({
				uuid: syncUUID,
				result: "delete"
			})

			setConfirmDeletion(prev => ({
				...prev,
				[syncUUID]: null
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [setConfirmDeletion, confirmDeletion, errorToast, loadingToast, t, syncUUID])

	const confirmDelRestart = useCallback(async () => {
		if (!confirmDeletion) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("syncs.dialogs.confirmDeletionRestart.title"),
				continueButtonText: t("syncs.dialogs.confirmDeletionRestart.continue"),
				description: t("syncs.dialogs.confirmDeletionRestart.description"),
				continueButtonVariant: "default"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await window.desktopAPI.syncUpdateConfirmDeletion({
				uuid: syncUUID,
				result: "restart"
			})

			await window.desktopAPI.syncResetCache({
				uuid: syncUUID
			})

			setConfirmDeletion(prev => ({
				...prev,
				[syncUUID]: null
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [setConfirmDeletion, confirmDeletion, errorToast, loadingToast, t, syncUUID])

	return (
		<div className="flex flex-row w-full px-4 pb-4">
			<div className="flex flex-col h-10 bg-secondary rounded-sm w-full">
				<div className="flex flex-row h-full w-full items-center px-4 justify-between gap-4">
					<div className="flex flex-row h-full w-full items-center gap-3 text-sm text-ellipsis line-clamp-1 break-all">
						{confirmDeletion ? (
							<>
								<Trash2
									className="text-red-500"
									size={16}
								/>
								<p>
									{confirmDeletion.where === "both"
										? t("syncs.info.confirmDeletionBoth", { previous: confirmDeletion.previous })
										: confirmDeletion.where === "local"
											? t("syncs.info.confirmDeletionLocal", { previous: confirmDeletion.previous })
											: t("syncs.info.confirmDeletionRemote", { previous: confirmDeletion.previous })}
								</p>
								<p
									className="text-red-500 hover:underline cursor-pointer"
									onClick={confirmDel}
								>
									{t("syncs.info.confirm")}
								</p>
								<p
									className="text-blue-500 hover:underline cursor-pointer"
									onClick={confirmDelRestart}
								>
									{t("syncs.info.restart")}
								</p>
							</>
						) : taskErrors + localTreeErrors > 0 ? (
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
