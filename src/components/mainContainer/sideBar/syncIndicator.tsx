import { memo } from "react"
import { RefreshCw } from "lucide-react"
import useIsSyncActive from "@/hooks/useIsSyncActive"

export const SyncIndicator = memo(({ iconSize }: { iconSize: number }) => {
	const isSyncActive = useIsSyncActive()

	return (
		<RefreshCw
			size={iconSize}
			className={isSyncActive ? "animate-spin-medium" : undefined}
		/>
	)
})

export default SyncIndicator
