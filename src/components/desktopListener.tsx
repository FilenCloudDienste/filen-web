import { memo, useEffect, useRef } from "react"
import { IS_DESKTOP } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useSyncsStore, type Transfer, type GeneralError } from "@/stores/syncs.store"
import pathModule from "path"
import throttle from "lodash/throttle"
import { calcTimeLeft, calcSpeed, getTimeRemaining } from "./transfers/utils"
import { useTranslation } from "react-i18next"

export const DesktopListener = memo(() => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const {
		setTransferEvents,
		setCycleState,
		setTransfers,
		setErrors,
		setTaskErrors,
		setLocalIgnored,
		setRemoteIgnored,
		setRemainingReadable,
		setProgress,
		setRemaining,
		setSpeed,
		transfers
	} = useSyncsStore()
	const bytesSent = useRef<Record<string, number>>({}).current
	const allBytes = useRef<Record<string, number>>({}).current
	const progressStarted = useRef<Record<string, number>>({}).current
	const { t } = useTranslation()

	const updateProgress = useRef(
		throttle((syncUUID: string) => {
			if (!bytesSent[syncUUID]) {
				bytesSent[syncUUID] = 0
			}

			if (!allBytes[syncUUID]) {
				allBytes[syncUUID] = 0
			}

			if (!progressStarted[syncUUID]) {
				progressStarted[syncUUID] = -1
			}

			const now = Date.now()
			const transferRemaining = calcTimeLeft(bytesSent[syncUUID]!, allBytes[syncUUID]!, progressStarted[syncUUID]!)
			const transferPercent = (bytesSent[syncUUID]! / allBytes[syncUUID]!) * 100
			const transferSpeed = calcSpeed(now, progressStarted[syncUUID]!, bytesSent[syncUUID]!)

			setRemaining(prev => ({
				...prev,
				[syncUUID]: transferRemaining
			}))

			setSpeed(prev => ({
				...prev,
				[syncUUID]: transferSpeed
			}))

			setProgress(prev => ({
				...prev,
				[syncUUID]: isNaN(transferPercent) ? 0 : transferPercent >= 100 ? 100 : transferPercent
			}))

			const remainingReadable = getTimeRemaining(now + transferRemaining * 1000)

			if (remainingReadable.total <= 1 || remainingReadable.seconds <= 1) {
				remainingReadable.total = 1
				remainingReadable.days = 0
				remainingReadable.hours = 0
				remainingReadable.minutes = 0
				remainingReadable.seconds = 1
			}

			setRemainingReadable(prev => ({
				...prev,
				[syncUUID]: t("transfers.remaining", {
					time:
						(remainingReadable.days > 0 ? remainingReadable.days + "d " : "") +
						(remainingReadable.hours > 0 ? remainingReadable.hours + "h " : "") +
						(remainingReadable.minutes > 0 ? remainingReadable.minutes + "m " : "") +
						(remainingReadable.seconds > 0 ? remainingReadable.seconds + "s " : "")
				})
			}))
		}, 100)
	).current

	useEffect(() => {
		for (const syncUUID in transfers) {
			const ongoingTransfers = transfers[syncUUID]!.filter(
				transfer => transfer.state === "queued" || transfer.state === "started" || transfer.state === "paused"
			)

			if (ongoingTransfers.length <= 0) {
				bytesSent[syncUUID] = 0
				progressStarted[syncUUID] = -1
				allBytes[syncUUID] = 0

				setRemaining(prev => ({
					...prev,
					[syncUUID]: 0
				}))

				setSpeed(prev => ({
					...prev,
					[syncUUID]: 0
				}))

				setProgress(prev => ({
					...prev,
					[syncUUID]: 0
				}))
			}
		}
	}, [transfers, setSpeed, setRemaining, setProgress, allBytes, bytesSent, progressStarted])

	useEffect(() => {
		let syncMessageListener: ReturnType<typeof window.desktopAPI.onMainToWindowMessage> | null = null

		if (IS_DESKTOP && authed) {
			syncMessageListener = window.desktopAPI.onMainToWindowMessage(msg => {
				if (msg.type !== "sync") {
					return
				}

				const { message } = msg

				if (
					message.type === "cycleApplyingStateDone" ||
					message.type === "cycleApplyingStateStarted" ||
					message.type === "cycleError" ||
					message.type === "cycleGettingTreesDone" ||
					message.type === "cycleGettingTreesStarted" ||
					message.type === "cycleLocalSmokeTestFailed" ||
					message.type === "cycleNoChanges" ||
					message.type === "cyclePaused" ||
					message.type === "cycleProcessingDeltasDone" ||
					message.type === "cycleProcessingDeltasStarted" ||
					message.type === "cycleProcessingTasksDone" ||
					message.type === "cycleProcessingTasksStarted" ||
					message.type === "cycleRemoteSmokeTestFailed" ||
					message.type === "cycleRestarting" ||
					message.type === "cycleSavingStateDone" ||
					message.type === "cycleSavingStateStarted" ||
					message.type === "cycleStarted" ||
					message.type === "cycleSuccess" ||
					message.type === "cycleWaitingForLocalDirectoryChangesDone" ||
					message.type === "cycleWaitingForLocalDirectoryChangesStarted" ||
					message.type === "cycleAcquiringLockDone" ||
					message.type === "cycleAcquiringLockStarted" ||
					message.type === "cycleReleasingLockDone" ||
					message.type === "cycleExited" ||
					message.type === "cycleReleasingLockStarted"
				) {
					if (message.type === "cycleError") {
						setErrors(prev => ({
							...prev,
							[message.syncPair.uuid]: prev[message.syncPair.uuid]
								? [
										{
											type: "cycle",
											error: message.data.error
										},
										...prev[message.syncPair.uuid]!
									]
								: [
										{
											type: "cycle",
											error: message.data.error
										}
									]
						}))
					}

					setCycleState(prev => ({
						...prev,
						[message.syncPair.uuid]: message.type
					}))
				} else if (message.type === "transfer") {
					if (message.data.type === "error") {
						const error = message.data.error

						setErrors(prev => ({
							...prev,
							[message.syncPair.uuid]: prev[message.syncPair.uuid]
								? [
										{
											type: "transfer",
											error
										},
										...prev[message.syncPair.uuid]!
									]
								: [
										{
											type: "transfer",
											error
										}
									]
						}))
					}

					if (message.data.of === "download" || message.data.of === "upload") {
						const now = Date.now()

						if (message.data.type === "queued") {
							const transfer: Transfer = {
								type: message.data.of,
								localPath: message.data.localPath,
								relativePath: message.data.relativePath,
								state: "queued",
								bytes: 0,
								name: pathModule.posix.basename(message.data.relativePath),
								size: 0,
								startedTimestamp: 0,
								finishedTimestamp: 0,
								queuedTimestamp: now,
								errorTimestamp: 0,
								progressTimestamp: 0
							}

							setTransfers(prev => ({
								...prev,
								[message.syncPair.uuid]: prev[message.syncPair.uuid]
									? [transfer, ...prev[message.syncPair.uuid]!]
									: [transfer]
							}))

							if (!progressStarted[message.syncPair.uuid]) {
								progressStarted[message.syncPair.uuid] = -1
							}

							if (progressStarted[message.syncPair.uuid] === -1) {
								progressStarted[message.syncPair.uuid] = now
							} else {
								if (now < progressStarted[message.syncPair.uuid]!) {
									progressStarted[message.syncPair.uuid] = now
								}
							}
						} else if (message.data.type === "started") {
							const { data } = message

							setTransfers(prev => ({
								...prev,
								[message.syncPair.uuid]: prev[message.syncPair.uuid]
									? prev[message.syncPair.uuid]!.map(transfer =>
											transfer.localPath === data.localPath
												? {
														...transfer,
														state: "started",
														startedTimestamp: now,
														size: data.size
													}
												: transfer
										)
									: []
							}))

							if (!allBytes[message.syncPair.uuid]) {
								allBytes[message.syncPair.uuid] = -1
							}

							allBytes[message.syncPair.uuid]! += data.size
						} else if (message.data.type === "progress") {
							const { data } = message

							setTransfers(prev => ({
								...prev,
								[message.syncPair.uuid]: prev[message.syncPair.uuid]
									? prev[message.syncPair.uuid]!.map(transfer =>
											transfer.localPath === data.localPath
												? {
														...transfer,
														bytes: transfer.bytes + data.bytes,
														progressTimestamp: now
													}
												: transfer
										)
									: []
							}))

							if (!bytesSent[message.syncPair.uuid]) {
								bytesSent[message.syncPair.uuid] = -1
							}

							bytesSent[message.syncPair.uuid]! += data.bytes
						} else if (message.data.type === "finished") {
							setTransfers(prev => ({
								...prev,
								[message.syncPair.uuid]: prev[message.syncPair.uuid]
									? prev[message.syncPair.uuid]!.filter(transfer => transfer.localPath !== message.data.localPath)
									: []
							}))
						} else if (message.data.type === "error") {
							setTransfers(prev => ({
								...prev,
								[message.syncPair.uuid]: prev[message.syncPair.uuid]
									? prev[message.syncPair.uuid]!.map(transfer =>
											transfer.localPath === message.data.localPath
												? {
														...transfer,
														state: "error",
														errorTimestamp: now
													}
												: transfer
										)
									: []
							}))

							if (!allBytes[message.syncPair.uuid]) {
								allBytes[message.syncPair.uuid] = -1
							}

							if (allBytes[message.syncPair.uuid]! >= message.data.size) {
								allBytes[message.syncPair.uuid]! -= message.data.size
							}
						}

						updateProgress(message.syncPair.uuid)
					} else {
						setTransferEvents(prev => ({
							...prev,
							[message.syncPair.uuid]: prev[message.syncPair.uuid]
								? [
										{
											...message.data,
											timestamp: Date.now()
										},
										...(prev[message.syncPair.uuid]!.length >= 1000
											? prev[message.syncPair.uuid]!.slice(0, 999)
											: prev[message.syncPair.uuid]!)
									]
								: [
										{
											...message.data,
											timestamp: Date.now()
										}
									]
						}))
					}
				} else if (message.type === "taskErrors") {
					if (message.data.errors.length > 0) {
						setTaskErrors(prev => ({
							...prev,
							[message.syncPair.uuid]: message.data.errors
						}))
					}
				} else if (message.type === "error") {
					setErrors(prev => ({
						...prev,
						["general"]: prev["general"]
							? [
									{
										type: "general",
										error: message.data.error
									},
									...prev["general"]!
								]
							: [
									{
										type: "general",
										error: message.data.error
									}
								]
					}))
				} else if (message.type === "localTreeErrors") {
					const errors: GeneralError[] = message.data.errors.map(err => ({
						error: err.error,
						type: "localTree"
					}))

					setErrors(prev => ({
						...prev,
						[message.syncPair.uuid]: prev[message.syncPair.uuid] ? [...errors, ...prev[message.syncPair.uuid]!] : errors
					}))
				} else if (message.type === "remoteTreeIgnored") {
					setRemoteIgnored(prev => ({
						...prev,
						[message.syncPair.uuid]: message.data.ignored
					}))
				} else if (message.type === "localTreeIgnored") {
					setLocalIgnored(prev => ({
						...prev,
						[message.syncPair.uuid]: message.data.ignored
					}))
				}
			})
		}

		return () => {
			syncMessageListener?.remove()
		}
	}, [
		setTransferEvents,
		setCycleState,
		setTransfers,
		authed,
		setErrors,
		setTaskErrors,
		setLocalIgnored,
		setRemoteIgnored,
		updateProgress,
		allBytes,
		progressStarted,
		bytesSent
	])

	return null
})

export default DesktopListener
