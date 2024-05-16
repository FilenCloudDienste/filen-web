import { cn } from "@/lib/utils"
import { memo } from "react"

const Skeleton = memo(({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	)
})

export { Skeleton }
