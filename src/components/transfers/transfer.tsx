import { memo, useCallback, useMemo } from "react"
import { type Transfer as TransferType, type TransferState, useTransfersStore } from "@/stores/transfers.store"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import { IS_DESKTOP } from "@/constants"
import { fileNameToSVGIcon, ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
import { formatBytes } from "@/utils"
import { Button } from "../ui/button"
import { Play, Pause, XCircle, Loader } from "lucide-react"

export const TransferProgress = memo(({ state, bytes, size }: { state: TransferState; bytes: number; size: number }) => {
	const progressNormalized = useMemo(() => {
		return parseFloat(((bytes / size) * 100).toFixed(2))
	}, [size, bytes])

	return (
		<Progress
			value={
				state === "error"
					? 100
					: state === "queued"
						? 0
						: state === "finished"
							? 100
							: progressNormalized >= 99
								? 99
								: progressNormalized
			}
			max={100}
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
		uuid,
		isDirectory
	}: {
		state: TransferState
		bytes: number
		size: number
		type: "upload" | "download"
		uuid: string
		isDirectory: boolean
	}) => {
		const { t } = useTranslation()
		const setTransfers = useTransfersStore(useCallback(state => state.setTransfers, []))

		const progressNormalized = useMemo(() => {
			return parseFloat(((bytes / size) * 100).toFixed(2))
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
				) : progressNormalized <= 0 ? (
					<>
						{isDirectory ? (
							<Badge
								variant="secondary"
								className="items-center gap-2"
							>
								<Loader
									className="animate-spin-medium"
									size={14}
								/>
								{t("transfers.state.creatingDirectories")}
							</Badge>
						) : (
							<Badge variant="secondary">{t("transfers.state.queued")}</Badge>
						)}
					</>
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

export const TransferInfo = memo(({ name, size, isDirectory }: { name: string; size: number; isDirectory: boolean }) => {
	const formattedSize = useMemo(() => {
		return formatBytes(size)
	}, [size])

	return (
		<div className="flex flex-row items-center gap-4">
			<div className="flex flex-row items-center">
				<div className="bg-secondary rounded-md flex items-center justify-center aspect-square w-10">
					{isDirectory ? (
						<ColoredFolderSVGIcon
							width={24}
							height={24}
						/>
					) : (
						<img
							src={fileNameToSVGIcon(name)}
							className="w-[24px] h-[24px] shrink-0 object-cover"
							draggable={false}
						/>
					)}
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
					isDirectory={transfer.uuid.startsWith("directory:")}
				/>
				<TransferActions
					size={transfer.size}
					state={transfer.state}
					bytes={transfer.bytes}
					type={transfer.type}
					uuid={transfer.uuid}
					isDirectory={transfer.uuid.startsWith("directory:")}
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
