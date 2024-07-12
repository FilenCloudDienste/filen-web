import { memo, useCallback, useEffect, useMemo } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator
} from "@/components/ui/context-menu"
import { Delete, PauseCircle, PlayCircle } from "lucide-react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useTranslation } from "react-i18next"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { useSyncsStore } from "@/stores/syncs.store"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useNavigate } from "@tanstack/react-router"
import eventEmitter from "@/lib/eventEmitter"

const iconSize = 16

export const ContextMenu = memo(({ sync, children }: { sync: SyncPair; children: React.ReactNode }) => {
	const { t } = useTranslation()
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const navigate = useNavigate()
	const { setSelectedSync } = useSyncsStore()

	const syncConfig = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs.filter(pair => pair.uuid === sync.uuid)[0] ?? null
	}, [sync.uuid, desktopConfig])

	const togglePause = useCallback(() => {
		if (!syncConfig) {
			return
		}

		setDesktopConfig(prev => ({
			...prev,
			syncConfig: {
				...prev.syncConfig,
				syncPairs: prev.syncConfig.syncPairs.map(pair => (pair.uuid === sync.uuid ? { ...pair, paused: !syncConfig.paused } : pair))
			}
		}))
	}, [syncConfig, sync.uuid, setDesktopConfig])

	const deleteSync = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: t("syncs.dialogs.delete.title"),
				continueButtonText: t("syncs.dialogs.delete.continue"),
				description: t("syncs.dialogs.delete.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		setSelectedSync(null)
		setDesktopConfig(prev => ({
			...prev,
			syncConfig: {
				...prev.syncConfig,
				syncPairs: prev.syncConfig.syncPairs.filter(pair => pair.uuid !== sync.uuid)
			}
		}))

		navigate({
			to: "/syncs",
			replace: true,
			resetScroll: true
		})
	}, [setDesktopConfig, sync.uuid, navigate, t, setSelectedSync])

	useEffect(() => {
		const deleteSyncListener = eventEmitter.on("deleteSync", (uuid: string) => {
			if (uuid !== sync.uuid) {
				return
			}

			deleteSync()
		})

		const toggleSyncPauseListener = eventEmitter.on("toggleSyncPause", (uuid: string) => {
			if (uuid !== sync.uuid) {
				return
			}

			togglePause()
		})

		return () => {
			deleteSyncListener.remove()
			toggleSyncPauseListener.remove()
		}
	}, [sync.uuid, deleteSync, togglePause])

	if (!syncConfig) {
		return null
	}

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-48">
				<ContextMenuItem
					className="cursor-pointer gap-3"
					onClick={togglePause}
				>
					{syncConfig.paused ? (
						<>
							<PlayCircle size={iconSize} />
							{t("contextMenus.syncs.resume")}
						</>
					) : (
						<>
							<PauseCircle size={iconSize} />
							{t("contextMenus.syncs.pause")}
						</>
					)}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					className="cursor-pointer gap-3 text-red-500"
					onClick={deleteSync}
				>
					<Delete size={iconSize} />
					{t("contextMenus.syncs.delete")}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
