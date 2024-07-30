import { memo, useCallback, useMemo } from "react"
import { type Transfer as TransferType } from "@/stores/transfers.store"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { type TFunction } from "i18next"
import worker from "@/lib/worker"
import { IS_DESKTOP } from "@/constants"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { formatBytes } from "@/utils"
import { Button } from "../ui/button"
import { Play, Pause, XCircle } from "lucide-react"

export const Transfer = memo(
	({
		transfer,
		t,
		setTransfers
	}: {
		transfer: TransferType
		t: TFunction<"translation", undefined>
		setTransfers: (fn: TransferType[] | ((prev: TransferType[]) => TransferType[])) => void
	}) => {
		const progressNormalized = useMemo(() => {
			return parseInt(((transfer.bytes / transfer.size) * 100).toFixed(0))
		}, [transfer.bytes, transfer.size])

		const pause = useCallback(async () => {
			if (
				transfer.state === "stopped" ||
				transfer.state === "error" ||
				transfer.state === "finished" ||
				transfer.state === "paused" ||
				progressNormalized >= 95
			) {
				return
			}

			try {
				if (transfer.type === "download" && IS_DESKTOP) {
					await window.desktopAPI.pausePauseSignal({ id: transfer.uuid })
				} else {
					await worker.pausePauseSignal({ id: transfer.uuid })
				}

				setTransfers(prev => prev.map(t => (t.uuid === transfer.uuid ? { ...t, state: "paused" } : t)))
			} catch (e) {
				console.error(e)
			}
		}, [transfer.uuid, transfer.state, setTransfers, progressNormalized, transfer.type])

		const resume = useCallback(async () => {
			if (transfer.state === "stopped" || transfer.state === "error" || transfer.state === "finished") {
				return
			}

			try {
				if (transfer.type === "download" && IS_DESKTOP) {
					await window.desktopAPI.resumePauseSignal({ id: transfer.uuid })
				} else {
					await worker.resumePauseSignal({ id: transfer.uuid })
				}

				setTransfers(prev => prev.map(t => (t.uuid === transfer.uuid ? { ...t, state: "started" } : t)))
			} catch (e) {
				console.error(e)
			}
		}, [transfer.uuid, transfer.state, setTransfers, transfer.type])

		const abort = useCallback(async () => {
			if (transfer.state === "stopped" || transfer.state === "error" || progressNormalized >= 95) {
				return
			}

			try {
				if (transfer.type === "download" && IS_DESKTOP) {
					await window.desktopAPI.abortAbortSignal({ id: transfer.uuid })
				} else {
					await worker.abortAbortSignal({ id: transfer.uuid })
				}

				setTransfers(prev => prev.filter(t => t.uuid !== transfer.uuid))
			} catch (e) {
				console.error(e)
			}
		}, [transfer.uuid, transfer.state, setTransfers, progressNormalized, transfer.type])

		return (
			<div className="flex flex-col w-full gap-4 pb-4">
				<div className="flex flex-row items-center w-full gap-4 justify-between">
					<div className="flex flex-row items-center gap-4">
						<div className="flex flex-row items-center">
							<div className="bg-secondary rounded-md flex items-center justify-center aspect-square w-10">
								<img
									src={fileNameToSVGIcon(transfer.name)}
									className="w-[24px] h-[24px] shrink-0 object-cover"
									draggable={false}
								/>
							</div>
						</div>
						<div className="flex flex-col">
							<p className="line-clamp-1 text-ellipsis break-all">{transfer.name}</p>
							<p className="line-clamp-1 text-ellipsis break-all text-xs text-muted-foreground">
								{formatBytes(transfer.size)}
							</p>
						</div>
					</div>
					<div className="flex flex-row gap-1 shrink-0">
						{transfer.state === "error" || transfer.state === "queued" ? (
							<Badge variant={transfer.state === "error" ? "destructive" : "secondary"}>
								{t("transfers.state." + transfer.state)}
							</Badge>
						) : (
							<>
								{progressNormalized < 95 && (
									<>
										{transfer.state === "paused" ? (
											<Button
												variant="ghost"
												size="icon"
												onClick={resume}
											>
												<Play size={16} />
											</Button>
										) : (
											<Button
												variant="ghost"
												size="icon"
												onClick={pause}
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
									</>
								)}
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
								: progressNormalized >= 99
									? 99
									: progressNormalized
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

		return (
			<div className="flex flex-col gap-2 mb-3">
				<div className="flex flex-row justify-between items-center w-full gap-2">
					<div className="flex flex-row items-center max-w-[70%]">
						<p className="line-clamp-1 text-ellipsis break-all">{transfer.name}</p>
					</div>
					<div className="flex flex-row gap-1 shrink-0">
						{transfer.state === "error" ||
						transfer.state === "queued" ||
						transfer.state === "finished" ||
						transfer.state === "stopped" ? (
							<Badge variant={transfer.state === "error" ? "destructive" : "secondary"}>
								{t("transfers.state." + transfer.state)}
							</Badge>
						) : (
							<>
								{progressNormalized < 95 && (
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
							</>
						)}
					</div>
				</div>
				<Progress
					value={["error", "queued"].includes(transfer.state) ? 0 : transfer.state === "finished" ? 100 : progressNormalized}
					color="green"
					className={cn(
						"w-full h-[6px]",
						transfer.state === "finished" ? "progress-finished" : "",
						transfer.state === "error" ? "progress-error" : ""
					)}
				/>
			</div>
		)
	}
)

export default Transfer
