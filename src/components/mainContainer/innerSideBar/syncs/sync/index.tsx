import { memo, useCallback, useMemo } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { RefreshCw, PauseCircle } from "lucide-react"
import { Link } from "@tanstack/react-router"
import useRouteParent from "@/hooks/useRouteParent"
import { cn } from "@/lib/utils"
import ContextMenu from "./contextMenu"
import useIsSyncActive from "@/hooks/useIsSyncActive"
import { useSyncsStore } from "@/stores/syncs.store"
import { useLocalStorage } from "@uidotdev/usehooks"
import useDesktopConfig from "@/hooks/useDesktopConfig"

export const Sync = memo(({ sync }: { sync: SyncPair }) => {
	const routeParent = useRouteParent()
	const isSyncActive = useIsSyncActive(sync.uuid)
	const setSelectedSync = useSyncsStore(useCallback(state => state.setSelectedSync, []))
	const [, setLastSelectedSync] = useLocalStorage("lastSelectedSync", "")
	const [desktopConfig] = useDesktopConfig()

	const isPaused = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs.some(pair => pair.uuid === sync.uuid && pair.paused)
	}, [desktopConfig.syncConfig.syncPairs, sync.uuid])

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
					{isPaused ? (
						<PauseCircle size={20} />
					) : (
						<RefreshCw
							size={20}
							className={isSyncActive ? "animate-spin-medium" : undefined}
						/>
					)}
					<p className="line-clamp-1 text-ellipsis break-all">{sync.name}</p>
				</Link>
			</ContextMenu>
		</div>
	)
})

export default Sync
