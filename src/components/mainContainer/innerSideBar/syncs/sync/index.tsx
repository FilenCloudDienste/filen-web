import { memo, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { RefreshCw } from "lucide-react"
import { Link } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import { cn } from "@/lib/utils"
import ContextMenu from "./contextMenu"
import useIsSyncActive from "@/hooks/useIsSyncActive"
import { useSyncsStore } from "@/stores/syncs.store"
import { useLocalStorage } from "@uidotdev/usehooks"

export const Sync = memo(({ sync }: { sync: SyncPair }) => {
	const routeParent = useRouteParent()
	const isSyncActive = useIsSyncActive(sync.uuid)
	const setSelectedSync = useSyncsStore(useCallback(state => state.setSelectedSync, []))
	const [, setLastSelectedSync] = useLocalStorage("lastSelectedSync", "")

	const select = useCallback(() => {
		setLastSelectedSync(sync.uuid)
		setSelectedSync(sync)
	}, [setSelectedSync, sync, setLastSelectedSync])

	return (
		<div className="flex flex-col mb-0.5 px-3">
			<ContextMenu sync={sync}>
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
					onClick={select}
				>
					<RefreshCw
						size={20}
						className={isSyncActive ? "animate-spin-medium" : undefined}
					/>
					<p className="line-clamp-1 text-ellipsis break-all">{sync.name}</p>
				</Link>
			</ContextMenu>
		</div>
	)
})

export default Sync
