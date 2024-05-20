import { memo, useCallback } from "react"
import { type Transfer as TransferType, useTransfersStore } from "@/stores/transfers.store"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { type TFunction } from "i18next"
import worker from "@/lib/worker"

export const Transfer = memo(({ transfer, t }: { transfer: TransferType; t: TFunction<"translation", undefined> }) => {
	const { setTransfers } = useTransfersStore()

	const pause = useCallback(async () => {
		if (transfer.state === "stopped" || transfer.state === "error" || transfer.state === "finished" || transfer.state === "paused") {
			return
		}

		try {
			await worker.pausePauseSignal({ id: transfer.uuid })

			setTransfers(prev => prev.map(t => (t.uuid === transfer.uuid ? { ...t, state: "paused" } : t)))
		} catch (e) {
			console.error(e)
		}
	}, [transfer.uuid, transfer.state, setTransfers])

	const resume = useCallback(async () => {
		if (transfer.state === "stopped" || transfer.state === "error" || transfer.state === "finished") {
			return
		}

		try {
			await worker.resumePauseSignal({ id: transfer.uuid })

			setTransfers(prev => prev.map(t => (t.uuid === transfer.uuid ? { ...t, state: "started" } : t)))
		} catch (e) {
			console.error(e)
		}
	}, [transfer.uuid, transfer.state, setTransfers])

	const abort = useCallback(async () => {
		if (transfer.state === "stopped" || transfer.state === "error") {
			return
		}

		try {
			await worker.abortAbortSignal({ id: transfer.uuid })

			setTransfers(prev => prev.filter(t => t.uuid !== transfer.uuid))
		} catch (e) {
			console.error(e)
		}
	}, [transfer.uuid, transfer.state, setTransfers])

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-row justify-between items-center w-full">
				<div className="flex flex-row items-center max-w-[70%]">
					<p className="line-clamp-1 text-ellipsis">{transfer.name}</p>
				</div>
				<div className="flex flex-row gap-1">
					{transfer.state === "error" ||
					transfer.state === "queued" ||
					transfer.state === "finished" ||
					transfer.state === "stopped" ? (
						<Badge variant={transfer.state === "error" ? "destructive" : "secondary"}>
							{t("transfers.state." + transfer.state)}
						</Badge>
					) : (
						<>
							{transfer.state === "paused" ? (
								<Badge
									variant="default"
									onClick={resume}
									className="cursor-pointer"
								>
									{t("transfers.resume")}
								</Badge>
							) : (
								<Badge
									variant="default"
									onClick={pause}
									className="cursor-pointer"
								>
									{t("transfers.pause")}
								</Badge>
							)}
							<Badge
								variant="destructive"
								onClick={abort}
								className="cursor-pointer"
							>
								{t("transfers.stop")}
							</Badge>
						</>
					)}
				</div>
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
	)
})

export default Transfer
