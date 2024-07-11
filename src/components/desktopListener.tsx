import { memo, useEffect } from "react"
import { IS_DESKTOP } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useSyncsStore, type Transfer, type GeneralError } from "@/stores/syncs.store"
import pathModule from "path"

export const DesktopListener = memo(() => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const { setTransferEvents, setCycleState, setTransfers, setErrors, setTaskErrors, setLocalIgnored, setRemoteIgnored } = useSyncsStore()

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
						}
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
	}, [setTransferEvents, setCycleState, setTransfers, authed, setErrors, setTaskErrors, setLocalIgnored, setRemoteIgnored])

	return null
})

export default DesktopListener
