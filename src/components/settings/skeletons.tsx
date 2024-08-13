import { memo } from "react"
import { cn } from "@/lib/utils"
import { Loader } from "lucide-react"
import { IS_DESKTOP } from "@/constants"

export const Skeletons = memo(() => {
	return (
		<div
			className={cn(
				"flex flex-row items-center justify-center overflow-hidden",
				IS_DESKTOP ? "h-[calc(100dvh-48px)]" : "h-[calc(100dvh-32px)]"
			)}
		>
			<Loader className="animate-spin-medium" />
		</div>
	)
})

export default Skeletons
