import { memo, useState, useEffect, useMemo, useRef, useTransition, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTranslation } from "react-i18next"
import useWindowSize from "@/hooks/useWindowSize"
import eventEmitter from "@/lib/eventEmitter"
import { type WorkerToMainMessage } from "@/lib/worker/types"
import { useTransfersStore, type TransferState } from "@/stores/transfers.store"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { calcSpeed, calcTimeLeft, getTimeRemaining, bpsToReadable } from "./utils"
import { cn } from "@/lib/utils"
import throttle from "lodash/throttle"
import { ArrowDownUp } from "lucide-react"

const transferStateSortingPriority: Record<TransferState, number> = {
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
	const { transfers, setTransfers, speed, setProgress, setRemaining, setSpeed, remaining, setFinishedTransfers } = useTransfersStore()
	const [virtualizerParentRef, setVirtualizerParentRef] = useState<HTMLDivElement | null>(null)
	const bytesSent = useRef<number>(0)
	const allBytes = useRef<number>(0)
	const progressStarted = useRef<number>(-1)
	const [, startTransition] = useTransition()
	const [remainingReadable, setRemainingReadable] = useState<string>("")

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
		return transfers.sort((a, b) => transferStateSortingPriority[a.state] - transferStateSortingPriority[b.state])
	}, [transfers])

	const ongoingTransfers = useMemo(() => {
		return transfersSorted.filter(transfer => transfer.state === "queued" || transfer.state === "started")
	}, [transfersSorted])

	const rowVirtualizer = useVirtualizer({
		count: transfersSorted.length,
		getScrollElement: () => virtualizerParentRef,
		estimateSize: () => 60,
		getItemKey(index) {
			return transfersSorted[index].uuid
		},
		overscan: 5
	})

	const updateInfo = useRef(
		throttle(() => {
			startTransition(() => {
				const now = Date.now()
				const transferRemaining = calcTimeLeft(bytesSent.current, allBytes.current, progressStarted.current)
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
			})
		}, 250)
	).current

	useEffect(() => {
		if (ongoingTransfers.length === 0) {
			bytesSent.current = 0
			progressStarted.current = -1
			allBytes.current = 0

			startTransition(() => {
				setRemaining(0)
				setSpeed(0)
				setProgress(0)
			})
		}
	}, [ongoingTransfers, setRemaining, setSpeed, setProgress])

	useEffect(() => {
		const listener = eventEmitter.on("openTransfers", () => {
			setOpen(true)
		})

		const workerMessageListener = eventEmitter.on("workerMessage", (message: WorkerToMainMessage) => {
			startTransition(() => {
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
								size: message.data.size,
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

						allBytes.current += message.data.size
					} else if (message.data.type === "started") {
						setTransfers(prev =>
							prev.map(transfer =>
								transfer.uuid === message.data.uuid
									? { ...transfer, state: "started", startedTimestamp: Date.now() }
									: transfer
							)
						)
					} else if (message.data.type === "progress") {
						const bytes = message.data.bytes

						bytesSent.current += bytes

						setTransfers(prev =>
							prev.map(transfer =>
								transfer.uuid === message.data.uuid
									? { ...transfer, bytes: transfer.bytes + bytes, progressTimestamp: Date.now() }
									: transfer
							)
						)
					} else if (message.data.type === "finished") {
						setFinishedTransfers(prev => [
							...prev,
							{
								type: message.type,
								uuid: message.data.uuid,
								state: "finished",
								bytes: message.data.size,
								name: message.data.name,
								size: message.data.size,
								startedTimestamp: 0,
								queuedTimestamp: now,
								errorTimestamp: 0,
								finishedTimestamp: Date.now(),
								progressTimestamp: 0
							}
						])
						setTransfers(prev => prev.filter(transfer => transfer.uuid !== message.data.uuid))
					} else if (message.data.type === "error") {
						if (allBytes.current >= message.data.size) {
							allBytes.current -= message.data.size
						}

						setTransfers(prev =>
							prev.map(transfer =>
								transfer.uuid === message.data.uuid ? { ...transfer, state: "error", errorTimestamp: Date.now() } : transfer
							)
						)
					} else if (message.data.type === "stopped") {
						if (allBytes.current >= message.data.size) {
							allBytes.current -= message.data.size
						}

						setTransfers(prev => prev.filter(transfer => transfer.uuid !== message.data.uuid))
					}

					updateInfo()
				}
			})
		})

		return () => {
			listener.remove()
			workerMessageListener.remove()
		}
	}, [setTransfers, setProgress, setRemaining, setSpeed, t, updateInfo, setFinishedTransfers])

	return (
		<Sheet
			open={open}
			onOpenChange={setOpen}
		>
			<SheetContent
				forceMount={true}
				className="outline-none focus:outline-none active:outline-none hover:outline-none no-outline"
				onDragOver={onDragOver}
			>
				<SheetHeader>
					<SheetTitle>{transfersSorted.length > 0 && t("transfers.title")}</SheetTitle>
				</SheetHeader>
				<div
					ref={setVirtualizerParentRef}
					style={{
						height: windowSize.height - (remaining > 0 && speed > 0 ? 130 : 85),
						overflowX: "hidden",
						overflowY: "auto",
						marginTop: 10
					}}
					onDragOver={onDragOver}
				>
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative"
						}}
						onDragOver={onDragOver}
					>
						{transfersSorted.length === 0 ? (
							<div
								className="w-full flex flex-col items-center justify-center text-muted-foreground gap-2"
								style={{ height: windowSize.height - 85 }}
							>
								<ArrowDownUp size={60} />
								<p>{t("transfers.noActiveTransfers")}</p>
							</div>
						) : (
							rowVirtualizer.getVirtualItems().map(virtualItem => {
								const transfer = transfersSorted[virtualItem.index]

								return (
									<div
										key={virtualItem.key}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualItem.size}px`,
											transform: `translateY(${virtualItem.start}px)`
										}}
									>
										<div className="flex flex-col gap-2">
											<div className="flex flex-row justify-between items-center w-full">
												<div className="flex flex-row items-center max-w-[70%]">
													<p className="line-clamp-1 text-ellipsis">{transfer.name}</p>
												</div>
												{transfer.state !== "started" ? (
													<Badge variant={transfer.state === "error" ? "destructive" : "secondary"}>
														{t("transfers.state." + transfer.state)}
													</Badge>
												) : (
													<Badge variant="default">{t("transfers.pause")}</Badge>
												)}
											</div>
											<Progress
												value={
													["error", "queued"].includes(transfer.state)
														? 0
														: transfer.state === "finished"
															? 100
															: parseInt(((transfer.bytes / transfer.size) * 100).toFixed(0))
												}
												color="green"
												className={cn(
													"w-full h-[6px]",
													transfer.state === "finished" ? "progress-finished" : "",
													transfer.state === "error" ? "progress-error" : ""
												)}
											/>
										</div>
									</div>
								)
							})
						)}
					</div>
				</div>
				{remaining > 0 && speed > 0 && (
					<div className="flex flex-row justify-between items-center gap-4 h-14 text-muted-foreground">
						<p>{remainingReadable}</p>
						<p>{bpsToReadable(speed)}</p>
					</div>
				)}
			</SheetContent>
		</Sheet>
	)
})

export default Transfers
