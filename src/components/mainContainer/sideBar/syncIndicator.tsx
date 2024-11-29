import { memo } from "react"
import { RefreshCw } from "lucide-react"
import useIsSyncActive from "@/hooks/useIsSyncActive"
import { cn } from "@/lib/utils"
import useSyncIssueCount from "@/hooks/useSyncIssueCount"
import useSyncConfirmDeletion from "@/hooks/useSyncConfirmDeletion"

export const SyncIndicator = memo(({ iconSize }: { iconSize: number }) => {
	const isSyncActive = useIsSyncActive()
	const syncIssueCount = useSyncIssueCount()
	const syncConfirmDeletion = useSyncConfirmDeletion()

	return (
		<RefreshCw
			size={iconSize}
			className={cn(
				isSyncActive && syncIssueCount + syncConfirmDeletion.length === 0 && "animate-spin-medium",
				syncIssueCount + syncConfirmDeletion.length > 0 && "text-orange-500"
			)}
		/>
	)
})

export default SyncIndicator
