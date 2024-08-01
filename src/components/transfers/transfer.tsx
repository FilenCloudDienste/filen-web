import { memo, useCallback, useMemo } from "react"
import { type Transfer as TransferType, type TransferState, useTransfersStore } from "@/stores/transfers.store"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import { IS_DESKTOP } from "@/constants"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { formatBytes } from "@/utils"
import { Button } from "../ui/button"
import { Play, Pause, XCircle } from "lucide-react"

export const TransferProgress = memo(({ state, bytes, size }: { state: TransferState; bytes: number; size: number }) => {
	const progressNormalized = useMemo(() => {
		return parseInt(((bytes / size) * 100).toFixed(0))
	}, [size, bytes])

	return (
		<Progress
			value={
				["error", "queued"].includes(state) ? 0 : state === "finished" ? 100 : progressNormalized >= 99 ? 99 : progressNormalized
			}
			color="green"
			className={cn("w-full h-[6px]", state === "finished" ? "progress-finished" : "", state === "error" ? "progress-error" : "")}
		/>
	)
})

export const TransferActions = memo(
	({
		state,
		bytes,
		size,
		type,
		uuid
	}: {
		state: TransferState
		bytes: number
		size: number
		type: "upload" | "download"
		uuid: string
	}) => {
		const { t } = useTranslation()
		const setTransfers = useTransfersStore(useCallback(state => state.setTransfers, []))

		const progressNormalized = useMemo(() => {
			return parseInt(((bytes / size) * 100).toFixed(0))
		}, [size, bytes])

		const pause = useCallback(async () => {
			if (state === "stopped" || state === "error" || state === "finished" || state === "paused" || progressNormalized >= 95) {
				return
			}

			try {
				if (type === "download" && IS_DESKTOP) {
					await window.desktopAPI.pausePauseSignal({ id: uuid })
				} else {
					await worker.pausePauseSignal({ id: uuid })
				}

				setTransfers(prev => prev.map(t => (t.uuid === uuid ? { ...t, state: "paused" } : t)))
			} catch (e) {
				console.error(e)
			}
		}, [uuid, state, setTransfers, progressNormalized, type])

		const resume = useCallback(async () => {
			if (state === "stopped" || state === "error" || state === "finished") {
				return
			}

			try {
				if (type === "download" && IS_DESKTOP) {
					await window.desktopAPI.resumePauseSignal({ id: uuid })
				} else {
					await worker.resumePauseSignal({ id: uuid })
				}

				setTransfers(prev => prev.map(t => (t.uuid === uuid ? { ...t, state: "started" } : t)))
			} catch (e) {
				console.error(e)
			}
		}, [uuid, state, setTransfers, type])

		const abort = useCallback(async () => {
			if (state === "stopped" || state === "error" || progressNormalized >= 95) {
				return
			}

			try {
				if (type === "download" && IS_DESKTOP) {
					await window.desktopAPI.abortAbortSignal({ id: uuid })
				} else {
					await worker.abortAbortSignal({ id: uuid })
				}

				setTransfers(prev => prev.filter(t => t.uuid !== uuid))
			} catch (e) {
				console.error(e)
			}
		}, [uuid, state, setTransfers, progressNormalized, type])

		return (
			<div className="flex flex-row gap-1 shrink-0">
				{state === "error" || state === "queued" ? (
					<Badge variant={state === "error" ? "destructive" : "secondary"}>{t("transfers.state." + state)}</Badge>
				) : (
					<>
						{progressNormalized < 95 && (
							<>
								{state === "paused" ? (
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
		)
	}
)

export const TransferInfo = memo(({ name, size }: { name: string; size: number }) => {
	const formattedSize = useMemo(() => {
		return formatBytes(size)
	}, [size])

	return (
		<div className="flex flex-row items-center gap-4">
			<div className="flex flex-row items-center">
				<div className="bg-secondary rounded-md flex items-center justify-center aspect-square w-10">
					<img
						src={fileNameToSVGIcon(name)}
						className="w-[24px] h-[24px] shrink-0 object-cover"
						draggable={false}
					/>
				</div>
			</div>
			<div className="flex flex-col">
				<p className="line-clamp-1 text-ellipsis break-all">{name}</p>
				{size > 0 && <p className="line-clamp-1 text-ellipsis break-all text-xs text-muted-foreground">{formattedSize}</p>}
			</div>
		</div>
	)
})

export const Transfer = memo(({ transfer }: { transfer: TransferType }) => {
	return (
		<div className="flex flex-col w-full gap-4 pb-4">
			<div className="flex flex-row items-center w-full gap-4 justify-between">
				<TransferInfo
					name={transfer.name}
					size={transfer.size}
				/>
				<TransferActions
					size={transfer.size}
					state={transfer.state}
					bytes={transfer.bytes}
					type={transfer.type}
					uuid={transfer.uuid}
				/>
			</div>
			<TransferProgress
				size={transfer.size}
				bytes={transfer.bytes}
				state={transfer.state}
			/>
		</div>
	)
})

export default Transfer
