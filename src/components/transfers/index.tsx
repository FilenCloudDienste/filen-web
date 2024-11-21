import { memo, useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTranslation } from "react-i18next"
import useWindowSize from "@/hooks/useWindowSize"
import eventEmitter from "@/lib/eventEmitter"
import { type WorkerToMainMessage } from "@/lib/worker/types"
import { useTransfersStore, type TransferState, type Transfer as TransferType } from "@/stores/transfers.store"
import { Virtuoso } from "react-virtuoso"
import { calcSpeed, calcTimeLeft, getTimeRemaining, bpsToReadable } from "./utils"
import throttle from "lodash/throttle"
import { ArrowDownUp, Play, Pause, XCircle } from "lucide-react"
import { IS_DESKTOP } from "@/constants"
import Transfer from "./transfer"
import { type MainToWindowMessage } from "@filen/desktop/dist/ipc"
import worker from "@/lib/worker"
import useErrorToast from "@/hooks/useErrorToast"
import { Button } from "../ui/button"
import useDriveURLState from "@/hooks/useDriveURLState"

export const transferStateSortingPriority: Record<TransferState, number> = {
	started: 1,
	paused: 2,
	error: 3,
	queued: 4,
	stopped: 5,
	finished: 6
}

export const Transfers = memo(() => {
	const { t } = useTranslation()
	const windowSize = useWindowSize()
	const [open, setOpen] = useState<boolean>(false)
	const { transfers, setTransfers, speed, setProgress, setRemaining, setSpeed, remaining, setFinishedTransfers, finishedTransfers } =
		useTransfersStore(
			useCallback(
				state => ({
					transfers: state.transfers,
					setTransfers: state.setTransfers,
					speed: state.speed,
					setProgress: state.setProgress,
					setRemaining: state.setRemaining,
					setSpeed: state.setSpeed,
					remaining: state.remaining,
					setFinishedTransfers: state.setFinishedTransfers,
					finishedTransfers: state.finishedTransfers
				}),
				[]
			)
		)
	const bytesSent = useRef<number>(0)
	const allBytes = useRef<number>(0)
	const progressStarted = useRef<number>(-1)
	const [remainingReadable, setRemainingReadable] = useState<string>("")
	const [paused, setPaused] = useState<boolean>(false)
	const isTogglingPauseOrAbort = useRef<boolean>(false)
	const errorToast = useErrorToast()
	const driveURLState = useDriveURLState()

	const onDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			let hasFile = false

			if (e && e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
				for (const item of e.dataTransfer.items) {
					if (item.kind === "file") {
						hasFile = true

						break
					}
				}
			}

			if (hasFile && open) {
				setOpen(false)
			}
		},
		[open]
	)

	const transfersSorted = useMemo(() => {
		return transfers
			.sort((a, b) => transferStateSortingPriority[a.state] - transferStateSortingPriority[b.state])
			.concat(finishedTransfers.sort((a, b) => b.finishedTimestamp - a.finishedTimestamp))
	}, [transfers, finishedTransfers])

	const ongoingTransfers = useMemo(() => {
		return transfersSorted.filter(
			transfer => transfer.state === "queued" || transfer.state === "started" || transfer.state === "paused"
		)
	}, [transfersSorted])

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 130
	}, [windowSize.height])

	const getItemKey = useCallback((_: number, transfer: TransferType) => transfer.uuid, [])

	const itemContent = useCallback((_: number, transfer: TransferType) => {
		return <Transfer transfer={transfer} />
	}, [])

	const updateInfo = useRef(
		throttle(() => {
			const now = Date.now()
			let transferRemaining = calcTimeLeft(bytesSent.current, allBytes.current, progressStarted.current)

			if (ongoingTransfers.length > 0) {
				// Quick "hack" to better calculate remaining time when a lot of small files are being transferred (not really accurate, needs better solution)
				transferRemaining = transferRemaining + Math.floor(ongoingTransfers.length / 2)
			}

			const transferPercent = (bytesSent.current / allBytes.current) * 100
			const transferSpeed = calcSpeed(now, progressStarted.current, bytesSent.current)

			setRemaining(transferRemaining)
			setSpeed(transferSpeed)
			setProgress(isNaN(transferPercent) ? 0 : transferPercent >= 100 ? 100 : transferPercent)

			const remainingReadable = getTimeRemaining(now + transferRemaining * 1000)

			if (remainingReadable.total <= 1 || remainingReadable.seconds <= 1) {
				remainingReadable.total = 1
				remainingReadable.days = 0
				remainingReadable.hours = 0
				remainingReadable.minutes = 0
				remainingReadable.seconds = 1
			}

			setRemainingReadable(
				t("transfers.remaining", {
					time:
						(remainingReadable.days > 0 ? remainingReadable.days + "d " : "") +
						(remainingReadable.hours > 0 ? remainingReadable.hours + "h " : "") +
						(remainingReadable.minutes > 0 ? remainingReadable.minutes + "m " : "") +
						(remainingReadable.seconds > 0 ? remainingReadable.seconds + "s " : "")
				})
			)
		}, 250)
	).current

	const handleTransferUpdates = useCallback(
		(message: WorkerToMainMessage | MainToWindowMessage) => {
			if (message.type === "download" || message.type === "upload") {
				const now = Date.now()

				if (message.data.type === "queued") {
					setTransfers(prev => [
						...prev,
						{
							type: message.type,
							uuid: message.data.uuid,
							state: "queued",
							bytes: 0,
							name: message.data.name,
							size: 0,
							startedTimestamp: 0,
							queuedTimestamp: now,
							errorTimestamp: 0,
							finishedTimestamp: 0,
							progressTimestamp: 0
						}
					])

					if (progressStarted.current === -1) {
						progressStarted.current = now

						setOpen(true)
					} else {
						if (now < progressStarted.current) {
							progressStarted.current = now

							setOpen(true)
						}
					}
				} else if (message.data.type === "started") {
					setTransfers(prev =>
						prev.map(transfer =>
							transfer.uuid === message.data.uuid
								? {
										...transfer,
										state: "started",
										startedTimestamp: now,
										size: message.data.type === "started" ? message.data.size : 0
									}
								: transfer
						)
					)

					allBytes.current += message.data.size
				} else if (message.data.type === "progress") {
					const bytes = message.data.bytes

					setTransfers(prev =>
						prev.map(transfer =>
							transfer.uuid === message.data.uuid
								? {
										...transfer,
										bytes: transfer.bytes + bytes,
										progressTimestamp: now
									}
								: transfer
						)
					)

					bytesSent.current += bytes
				} else if (message.data.type === "finished") {
					setFinishedTransfers(prev => [
						...prev,
						{
							type: message.type,
							uuid: message.data.uuid,
							state: "finished",
							bytes: message.data.type === "finished" ? message.data.size : 0,
							name: message.data.name,
							size: message.data.type === "finished" ? message.data.size : 0,
							startedTimestamp: 0,
							queuedTimestamp: now,
							errorTimestamp: 0,
							finishedTimestamp: now,
							progressTimestamp: 0
						}
					])

					setTransfers(prev => prev.filter(transfer => transfer.uuid !== message.data.uuid))
				} else if (message.data.type === "error") {
					setTransfers(prev =>
						prev.map(transfer =>
							transfer.uuid === message.data.uuid
								? {
										...transfer,
										state: "error",
										errorTimestamp: now
									}
								: transfer
						)
					)

					if (allBytes.current >= message.data.size) {
						allBytes.current -= message.data.size
					}
				} else if (message.data.type === "stopped") {
					setTransfers(prev => prev.filter(transfer => transfer.uuid !== message.data.uuid))

					if (allBytes.current >= message.data.size) {
						allBytes.current -= message.data.size
					}
				}

				updateInfo()
			}
		},
		[setFinishedTransfers, setTransfers, updateInfo]
	)

	const abort = useCallback(async () => {
		if (isTogglingPauseOrAbort.current) {
			return
		}

		isTogglingPauseOrAbort.current = true

		try {
			await Promise.all(
				transfers.map(async transfer => {
					const progressNormalized = parseFloat(((transfer.bytes / transfer.size) * 100).toFixed(2))

					if (transfer.state === "stopped" || transfer.state === "error" || progressNormalized >= 95) {
						return
					}

					if (transfer.type === "download" && IS_DESKTOP) {
						await window.desktopAPI.abortAbortSignal({ id: transfer.uuid })
					} else {
						await worker.abortAbortSignal({ id: transfer.uuid })
					}

					setTransfers(prev => prev.filter(t => t.uuid !== transfer.uuid))
				})
			)

			setPaused(false)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			isTogglingPauseOrAbort.current = false
		}
	}, [errorToast, transfers, setTransfers])

	const togglePause = useCallback(async () => {
		if (isTogglingPauseOrAbort.current) {
			return
		}

		isTogglingPauseOrAbort.current = true

		try {
			if (paused) {
				await Promise.all(
					transfers.map(async transfer => {
						if (transfer.state === "stopped" || transfer.state === "error" || transfer.state === "finished") {
							return
						}

						if (transfer.type === "download" && IS_DESKTOP) {
							await window.desktopAPI.resumePauseSignal({ id: transfer.uuid })
						} else {
							await worker.resumePauseSignal({ id: transfer.uuid })
						}

						setTransfers(prev => prev.map(t => (t.uuid === transfer.uuid ? { ...t, state: "started" } : t)))
					})
				)

				setPaused(false)
			} else {
				await Promise.all(
					transfers.map(async transfer => {
						const progressNormalized = parseFloat(((transfer.bytes / transfer.size) * 100).toFixed(2))

						if (
							transfer.state === "stopped" ||
							transfer.state === "error" ||
							transfer.state === "finished" ||
							transfer.state === "paused" ||
							progressNormalized >= 95
						) {
							return
						}

						if (transfer.type === "download" && IS_DESKTOP) {
							await window.desktopAPI.pausePauseSignal({ id: transfer.uuid })
						} else {
							await worker.pausePauseSignal({ id: transfer.uuid })
						}

						setTransfers(prev => prev.map(t => (t.uuid === transfer.uuid ? { ...t, state: "paused" } : t)))
					})
				)

				setPaused(true)
			}
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			isTogglingPauseOrAbort.current = false
		}
	}, [paused, errorToast, transfers, setTransfers])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div
						className="w-full flex flex-col items-center justify-center text-muted-foreground gap-2"
						style={{
							height: virtuosoHeight
						}}
					>
						<ArrowDownUp size={60} />
						<p>{t("transfers.noActiveTransfers")}</p>
					</div>
				)
			}
		}
	}, [virtuosoHeight, t])

	const onOpenChange = useCallback(
		(o: boolean) => {
			if (driveURLState.publicLink && !o && ongoingTransfers.length > 0) {
				setOpen(true)

				return
			}

			setOpen(o)
		},
		[driveURLState.publicLink, ongoingTransfers.length]
	)

	const onInteractOutside = useCallback(() => {
		onOpenChange(false)
	}, [onOpenChange])

	useEffect(() => {
		if (ongoingTransfers.length <= 0) {
			bytesSent.current = 0
			progressStarted.current = -1
			allBytes.current = 0

			setRemaining(0)
			setSpeed(0)
			setProgress(0)
			setPaused(false)
		}
	}, [ongoingTransfers, setRemaining, setSpeed, setProgress])

	useEffect(() => {
		const listener = eventEmitter.on("openTransfers", () => {
			setOpen(true)
		})

		const workerMessageListener = eventEmitter.on("workerMessage", (message: WorkerToMainMessage) => {
			handleTransferUpdates(message)
		})

		let desktopMessageListener: { remove: () => void } | null = null

		if (IS_DESKTOP) {
			desktopMessageListener = window.desktopAPI.onMainToWindowMessage(handleTransferUpdates)
		}

		return () => {
			listener.remove()
			workerMessageListener.remove()

			if (desktopMessageListener) {
				desktopMessageListener.remove()
			}
		}
	}, [handleTransferUpdates])

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
		>
			<SheetContent
				forceMount={true}
				className="outline-none focus:outline-none active:outline-none hover:outline-none no-outline select-none"
				onDragOver={onDragOver}
				onInteractOutside={onInteractOutside}
				onPointerDownOutside={onInteractOutside}
			>
				<SheetHeader className="mb-4">
					<SheetTitle>{transfersSorted.length > 0 && t("transfers.title")}</SheetTitle>
				</SheetHeader>
				<Virtuoso
					data={transfersSorted}
					totalCount={transfersSorted.length}
					height={virtuosoHeight}
					width="100%"
					computeItemKey={getItemKey}
					itemContent={itemContent}
					onDragOver={onDragOver}
					defaultItemHeight={78}
					components={components}
					overscan={0}
					style={style}
				/>
				<div className="flex flex-row items-center gap-3 h-12 text-muted-foreground justify-end text-sm">
					{remaining > 0 && remainingReadable.length > 0 && remaining < Infinity && (
						<>
							<p className="line-clamp-1 text-ellipsis break-all">{remainingReadable}</p>
							<p className="line-clamp-1 text-ellipsis break-all">{bpsToReadable(speed)}</p>
							{ongoingTransfers.length > 0 && (
								<div className="flex flex-row items-center">
									{paused ? (
										<Button
											variant="ghost"
											size="icon"
											onClick={togglePause}
										>
											<Play size={16} />
										</Button>
									) : (
										<Button
											variant="ghost"
											size="icon"
											onClick={togglePause}
										>
											<Pause size={16} />
										</Button>
									)}
									<Button
										variant="ghost"
										size="icon"
										onClick={abort}
									>
										<XCircle
											size={16}
											className="text-red-500"
										/>
									</Button>
								</div>
							)}
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
})

export default Transfers
