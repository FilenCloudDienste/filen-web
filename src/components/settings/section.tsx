import { memo } from "react"
import { cn } from "@/lib/utils"

export const Section = memo(
	({
		name,
		children,
		className,
		info,
		nameClassName,
		infoClassName,
		childrenClassName,
		subInfo,
		subInfoClassName,
		withBottomBorder = true,
		style
	}: {
		name: string
		children: React.ReactNode
		className?: string
		info?: string
		nameClassName?: string
		infoClassName?: string
		childrenClassName?: string
		subInfo?: string
		subInfoClassName?: string
		withBottomBorder?: boolean
		style?: React.CSSProperties
	}) => {
		return (
			<div
				className={cn("flex flex-col gap-3", className)}
				style={style}
			>
				<div className={cn("flex flex-row justify-between items-center gap-14", info || subInfo ? "min-h-10" : "min-h-6")}>
					<div
						className="flex flex-col"
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "no-drag"
						}}
					>
						<p className={cn("line-clamp-1 text-ellipsis break-all", nameClassName)}>{name}</p>
						{info && <p className={cn("text-sm text-muted-foreground", infoClassName)}>{info}</p>}
						{subInfo && <p className={cn("text-sm text-muted-foreground", subInfoClassName)}>{subInfo}</p>}
					</div>
					<div
						className={cn("flex flex-row items-center gap-4", childrenClassName)}
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "no-drag"
						}}
					>
						{children}
					</div>
				</div>
				{withBottomBorder && <div className="w-full h-[1px] bg-border" />}
			</div>
		)
	}
)

export default Section
