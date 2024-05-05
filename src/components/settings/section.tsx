import { memo } from "react"
import { cn } from "@/lib/utils"

export const Section = memo(
	({ name, children, className, info }: { name: string; children: React.ReactNode; className?: string; info?: string }) => {
		return (
			<div className={cn("flex flex-col gap-3", className)}>
				<div className="flex flex-row justify-between items-center gap-14 min-h-10">
					<div className="flex flex-col">
						<p>{name}</p>
						{info && <p className="text-sm text-muted-foreground">{info}</p>}
					</div>
					<div className="flex flex-row items-center gap-4">{children}</div>
				</div>
				<div className="w-full h-[1px] bg-border" />
			</div>
		)
	}
)

export default Section
