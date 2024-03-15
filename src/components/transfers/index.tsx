import { memo, useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTranslation } from "react-i18next"
import useWindowSize from "@/hooks/useWindowSize"
import eventEmitter from "@/lib/eventEmitter"
import { type WorkerToMainMessage } from "@/lib/worker/types"
import { useTransfersStore, type TransferState } from "@/stores/transfers.store"
import { useVirtualizer } from "@tanstack/react-virtual"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const transferStateSortingPriority: Record<TransferState, number> = {
	started: 1,
	error: 2,
	queued: 3,
	finished: 4
}

export const Transfers = memo(() => {
	const { t } = useTranslation()
	const windowSize = useWindowSize()
	const [open, setOpen] = useState<boolean>(false)
	const { transfers, setTransfers } = useTransfersStore()
	const [virtualizerParentRef, setVirtualizerParentRef] = useState<HTMLDivElement | null>(null)

	const transfersSorted = useMemo(() => {
		return transfers.sort((a, b) => transferStateSortingPriority[a.state] - transferStateSortingPriority[b.state])
	}, [transfers])

	const rowVirtualizer = useVirtualizer({
		count: transfersSorted.length,
		getScrollElement: () => virtualizerParentRef,
		estimateSize: () => 65,
		getItemKey(index) {
			return transfersSorted[index].uuid
		},
		overscan: 5
	})

	useEffect(() => {
		const listener = eventEmitter.on("openTransfers", () => {
			setOpen(true)
		})

		const workerMessageListener = eventEmitter.on("workerMessage", (message: WorkerToMainMessage) => {
			if (message.type === "download") {
				if (message.data.type === "queued") {
					setTransfers(prev => [
						...prev,
						{
							type: "download",
							uuid: message.data.uuid,
							state: "queued",
							bytes: 0,
							name: message.data.name,
							size: message.data.size
						}
					])
				} else if (message.data.type === "started") {
					setTransfers(prev =>
						prev.map(transfer => (transfer.uuid === message.data.uuid ? { ...transfer, state: "started" } : transfer))
					)
				} else if (message.data.type === "progress") {
					const bytes = message.data.bytes

					setTransfers(prev =>
						prev.map(transfer =>
							transfer.uuid === message.data.uuid ? { ...transfer, bytes: transfer.bytes + bytes } : transfer
						)
					)
				} else if (message.data.type === "finished") {
					setTransfers(prev =>
						prev.map(transfer => (transfer.uuid === message.data.uuid ? { ...transfer, state: "finished" } : transfer))
					)
				} else if (message.data.type === "error") {
					setTransfers(prev =>
						prev.map(transfer => (transfer.uuid === message.data.uuid ? { ...transfer, state: "error" } : transfer))
					)
				}
			}
		})

		return () => {
			listener.remove()
			workerMessageListener.remove()
		}
	}, [setTransfers])

	return (
		<Sheet
			open={open}
			onOpenChange={setOpen}
		>
			<SheetContent
				onOpenAutoFocus={e => e.preventDefault()}
				forceMount={true}
			>
				<SheetHeader>
					<SheetTitle className="line-clamp-1 text-ellipsis mb-3">{t("transfers.title")}</SheetTitle>
					<div
						ref={setVirtualizerParentRef}
						className="w-full flex flex-col"
						style={{
							height: windowSize.height - 95,
							overflowX: "hidden",
							overflowY: "auto"
						}}
					>
						<div
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
								width: "100%",
								position: "relative"
							}}
						>
							{rowVirtualizer.getVirtualItems().map(virtualItem => {
								const transfer = transfersSorted[virtualItem.index]

								return (
									<div
										key={virtualItem.key}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${virtualItem.start}px)`
										}}
									>
										<div className="flex flex-col gap-3">
											<div className="flex flex-row justify-between items-center w-full">
												<div className="flex flex-row gap-2 items-center max-w-[70%]">
													<img
														src={fileNameToSVGIcon(transfer.name)}
														className="w-7 h-7"
													/>
													<p className="line-clamp-1 text-ellipsis">{transfer.name}</p>
												</div>
												<Badge variant={transfer.state === "error" ? "destructive" : "secondary"}>
													{transfer.state}
												</Badge>
											</div>
											<Progress
												value={
													["error", "queued"].includes(transfer.state)
														? 0
														: transfer.state === "finished"
															? 100
															: parseInt(((transfer.bytes / transfer.size) * 100).toFixed(0))
												}
												className="w-full h-[6px]"
											/>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</SheetHeader>
			</SheetContent>
		</Sheet>
	)
})

export default Transfers
