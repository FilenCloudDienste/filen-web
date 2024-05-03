import { memo } from "react"
import { cn } from "@/lib/utils"

export const Section = memo(({ name, children, className }: { name: string; children: React.ReactNode; className?: string }) => {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex flex-row justify-between items-center gap-4 h-10">
				<p>{name}</p>
				<div className="flex flex-row items-center gap-4">{children}</div>
			</div>
			<div className="w-full h-[1px] bg-border" />
		</div>
	)
})

export default Section
