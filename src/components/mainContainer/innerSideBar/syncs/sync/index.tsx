import { memo } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { RefreshCcw } from "lucide-react"
import { Link } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import { cn } from "@/lib/utils"

export const Sync = memo(({ sync }: { sync: SyncPair }) => {
	const routeParent = useRouteParent()

	return (
		<div className="flex flex-col mb-0.5 px-3">
			<Link
				to="/syncs/$uuid"
				params={{
					uuid: sync.uuid
				}}
				draggable={false}
				className={cn(
					"flex flex-row gap-2.5 w-full px-3 py-2 rounded-md transition-all items-center hover:bg-secondary text-primary cursor-pointer",
					routeParent === sync.uuid ? "bg-secondary" : "bg-transparent"
				)}
			>
				<RefreshCcw size={20} />
				<p>{sync.name}</p>
			</Link>
		</div>
	)
})

export default Sync
