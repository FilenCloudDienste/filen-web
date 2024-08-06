import { memo, useEffect, useRef, useCallback } from "react"
import { IS_DESKTOP } from "@/constants"
import useIsAuthed from "@/hooks/useIsAuthed"
import { useSyncsStore, type GeneralError } from "@/stores/syncs.store"
import throttle from "lodash/throttle"
import { calcTimeLeft, calcSpeed, getTimeRemaining } from "./transfers/utils"
import { type MainToWindowMessage } from "@filen/desktop/dist/ipc"
import useDesktopConfig from "@/hooks/useDesktopConfig"

export const DesktopListener = memo(() => {
	const [authed] = useIsAuthed()
	const {
		setTransferEvents,
		setCycleState,
		setErrors,
		setLocalIgnored,
		setRemoteIgnored,
		setRemainingReadable,
		setProgress,
		setRemaining,
		setSpeed,
		setTasksCount,
		setTasksSize,
		setTasksBytes
	} = useSyncsStore(
		useCallback(
			state => ({
				setTransferEvents: state.setTransferEvents,
				setCycleState: state.setCycleState,
				setErrors: state.setErrors,
				setLocalIgnored: state.setLocalIgnored,
				setRemoteIgnored: state.setRemoteIgnored,
				setRemainingReadable: state.setRemainingReadable,
				setProgress: state.setProgress,
				setRemaining: state.setRemaining,
				setSpeed: state.setSpeed,
				setTasksCount: state.setTasksCount,
				setTasksSize: state.setTasksSize,
				setTasksBytes: state.setTasksBytes
			}),
			[]
		)
	)
	const bytesSent = useRef<Record<string, number>>({})
	const allBytes = useRef<Record<string, number>>({})
	const tasksCount = useRef<Record<string, number>>({})
	const progressStarted = useRef<Record<string, number>>({})
	const [desktopConfig] = useDesktopConfig()
	const syncPairsUUIDsRef = useRef<string[]>(desktopConfig.syncConfig.syncPairs.map(pair => pair.uuid))

	const updateProgress = useRef(
		throttle((syncUUID: string) => {
			if (!bytesSent.current[syncUUID]) {
				bytesSent.current[syncUUID] = 0
			}

			if (!allBytes.current[syncUUID]) {
				allBytes.current[syncUUID] = 0
			}

			if (!progressStarted.current[syncUUID]) {
				progressStarted.current[syncUUID] = -1
			}

			const now = Date.now()
			let transferRemaining = calcTimeLeft(
				bytesSent.current[syncUUID]!,
				allBytes.current[syncUUID]!,
				progressStarted.current[syncUUID]!
			)
			const syncTasksCount = tasksCount.current[syncUUID] ? tasksCount.current[syncUUID]! : 0

			if (syncTasksCount > 0) {
				// Quick "hack" to better calculate remaining time when a lot of small files are being transferred (not really accurate, needs better solution)
				transferRemaining = transferRemaining + Math.floor(syncTasksCount / 2)
			}

			const transferPercent = (bytesSent.current[syncUUID]! / allBytes.current[syncUUID]!) * 100
			const transferSpeed = calcSpeed(now, progressStarted.current[syncUUID]!, bytesSent.current[syncUUID]!)

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
				[syncUUID]:
					(remainingReadable.days > 0 ? remainingReadable.days + "d " : "") +
					(remainingReadable.hours > 0 ? remainingReadable.hours + "h " : "") +
					(remainingReadable.minutes > 0 ? remainingReadable.minutes + "m " : "") +
					(remainingReadable.seconds > 0 ? remainingReadable.seconds + "s " : "")
			}))
		}, 250)
	).current

	const messageHandler = useCallback(
		(msg: MainToWindowMessage) => {
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
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

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
					[message.syncPair.uuid]: {
						state: message.type,
						timestamp: Date.now()
					}
				}))

				if (message.type === "cycleProcessingTasksDone") {
					bytesSent.current[message.syncPair.uuid] = 0
					progressStarted.current[message.syncPair.uuid] = -1
					allBytes.current[message.syncPair.uuid] = 0

					setRemaining(prev => ({
						...prev,
						[message.syncPair.uuid]: 0
					}))

					setSpeed(prev => ({
						...prev,
						[message.syncPair.uuid]: 0
					}))

					setProgress(prev => ({
						...prev,
						[message.syncPair.uuid]: 0
					}))

					setRemainingReadable(prev => ({
						...prev,
						[message.syncPair.uuid]: "1s"
					}))

					setTasksCount(prev => ({
						...prev,
						[message.syncPair.uuid]: 0
					}))

					tasksCount.current[message.syncPair.uuid] = 0

					setTasksSize(prev => ({
						...prev,
						[message.syncPair.uuid]: 0
					}))

					setTasksBytes(prev => ({
						...prev,
						[message.syncPair.uuid]: 0
					}))
				}
			} else if (message.type === "transfer") {
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

				if (message.data.of === "download" || message.data.of === "upload") {
					if (message.data.type === "queued") {
						if (!progressStarted.current[message.syncPair.uuid]) {
							progressStarted.current[message.syncPair.uuid] = -1
						}

						const now = Date.now()

						if (progressStarted.current[message.syncPair.uuid] === -1) {
							progressStarted.current[message.syncPair.uuid] = now
						} else {
							if (now < progressStarted.current[message.syncPair.uuid]!) {
								progressStarted.current[message.syncPair.uuid] = now
							}
						}
					} else if (message.data.type === "started") {
						const { data } = message

						if (!allBytes.current[message.syncPair.uuid]) {
							allBytes.current[message.syncPair.uuid] = -1
						}

						allBytes.current[message.syncPair.uuid]! += data.size
					} else if (message.data.type === "progress") {
						const { data } = message

						if (!bytesSent.current[message.syncPair.uuid]) {
							bytesSent.current[message.syncPair.uuid] = -1
						}

						bytesSent.current[message.syncPair.uuid]! += data.bytes

						setTasksBytes(prev => ({
							...prev,
							[message.syncPair.uuid]: prev[message.syncPair.uuid] ? prev[message.syncPair.uuid]! + data.bytes : data.bytes
						}))
					} else if (message.data.type === "error") {
						const { size } = message.data

						if (!allBytes.current[message.syncPair.uuid]) {
							allBytes.current[message.syncPair.uuid] = -1
						}

						if (allBytes.current[message.syncPair.uuid]! >= size) {
							allBytes.current[message.syncPair.uuid]! -= size
						}

						/*setErrors(prev => ({
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
						}))*/

						setTasksBytes(prev => ({
							...prev,
							[message.syncPair.uuid]: prev[message.syncPair.uuid] ? prev[message.syncPair.uuid]! - size : 0
						}))
					}

					updateProgress(message.syncPair.uuid)
				} else {
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

					setTasksCount(prev => {
						const count = prev[message.syncPair.uuid] ? prev[message.syncPair.uuid]! - 1 : 0

						tasksCount.current[message.syncPair.uuid] = count

						return {
							...prev,
							[message.syncPair.uuid]: count
						}
					})
				}
			} else if (message.type === "taskErrors") {
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

				if (message.data.errors.length > 0) {
					const errors: GeneralError[] = message.data.errors.map(err => ({
						error: err.error,
						type: "task"
					}))

					setErrors(prev => ({
						...prev,
						[message.syncPair.uuid]: prev[message.syncPair.uuid] ? [...errors, ...prev[message.syncPair.uuid]!] : errors
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
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

				const errors: GeneralError[] = message.data.errors.map(err => ({
					error: err.error,
					type: "localTree"
				}))

				setErrors(prev => ({
					...prev,
					[message.syncPair.uuid]: prev[message.syncPair.uuid] ? [...errors, ...prev[message.syncPair.uuid]!] : errors
				}))
			} else if (message.type === "remoteTreeIgnored") {
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

				setRemoteIgnored(prev => ({
					...prev,
					[message.syncPair.uuid]: message.data.ignored
				}))
			} else if (message.type === "localTreeIgnored") {
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

				setLocalIgnored(prev => ({
					...prev,
					[message.syncPair.uuid]: message.data.ignored
				}))
			} else if (message.type === "deltas") {
				if (!syncPairsUUIDsRef.current.includes(message.syncPair.uuid)) {
					return
				}

				setTasksCount(prev => ({
					...prev,
					[message.syncPair.uuid]: message.data.deltas.length
				}))

				tasksCount.current[message.syncPair.uuid] = message.data.deltas.length

				setTasksSize(prev => ({
					...prev,
					[message.syncPair.uuid]: message.data.deltas.reduce(
						(prev, delta) => prev + (delta.type === "uploadFile" || delta.type === "downloadFile" ? delta.size : 0),
						0
					)
				}))
			}
		},
		[
			setCycleState,
			setErrors,
			setLocalIgnored,
			setRemoteIgnored,
			setTransferEvents,
			updateProgress,
			setProgress,
			setRemaining,
			setRemainingReadable,
			setSpeed,
			setTasksCount,
			setTasksSize,
			setTasksBytes
		]
	)

	useEffect(() => {
		syncPairsUUIDsRef.current = desktopConfig.syncConfig.syncPairs.map(pair => pair.uuid)
	}, [desktopConfig.syncConfig.syncPairs])

	useEffect(() => {
		let syncMessageListener: ReturnType<typeof window.desktopAPI.onMainToWindowMessage> | null = null

		if (IS_DESKTOP && authed) {
			syncMessageListener = window.desktopAPI.onMainToWindowMessage(messageHandler)
		}

		return () => {
			syncMessageListener?.remove()
		}
	}, [messageHandler, authed])

	return null
})

export default DesktopListener
