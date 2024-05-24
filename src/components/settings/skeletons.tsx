import { Skeleton } from "../ui/skeleton"
import { memo } from "react"
import useIsMobile from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"

export const Skeletons = memo(() => {
	const isMobile = useIsMobile()

	return (
		<div className={cn("flex flex-col p-6 h-full overflow-hidden", isMobile ? "w-full" : "w-4/6")}>
			{new Array(50).fill(1).map((_, index) => {
				return (
					<div
						key={index}
						className="flex flex-col gap-3 mb-10"
					>
						<Skeleton className="w-full h-[57px] rounded-md" />
						<Skeleton className="w-full h-[57px] rounded-md" />
					</div>
				)
			})}
		</div>
	)
})

export default Skeletons
