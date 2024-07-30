import { memo, useMemo } from "react"
import { type Transfer as TransferType } from "@/stores/syncs.store"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { formatBytes } from "@/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"

export const Transfer = memo(({ transfer }: { transfer: TransferType }) => {
	const progressNormalized = useMemo(() => {
		return parseInt(((transfer.bytes / transfer.size) * 100).toFixed(0))
	}, [transfer.bytes, transfer.size])

	return (
		<div className="flex flex-col w-full px-4 gap-4 pb-4">
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
						<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
							<Tooltip>
								<TooltipTrigger asChild={true}>
									<p className="line-clamp-1 text-ellipsis break-all">{transfer.name}</p>
								</TooltipTrigger>
								<TooltipContent className="max-w-[calc(100vw/2)]">
									<p>{transfer.type === "upload" ? transfer.localPath : transfer.relativePath}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<p className="line-clamp-1 text-ellipsis break-all text-xs text-muted-foreground">{formatBytes(transfer.size)}</p>
					</div>
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
})

export default Transfer
