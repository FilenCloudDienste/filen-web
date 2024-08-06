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
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useIsSyncActive from "@/hooks/useIsSyncActive"

const iconSize = 16

export const ContextMenu = memo(({ sync, children }: { sync: SyncPair; children: React.ReactNode }) => {
	const { t } = useTranslation()
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const navigate = useNavigate()
	const {
		setSelectedSync,
		setChanging,
		changing,
		setCycleState,
		setLocalIgnored,
		setErrors,
		setProgress,
		setRemaining,
		setRemainingReadable,
		setRemoteIgnored,
		setSpeed,
		setTasksBytes,
		setTasksCount,
		setTasksSize,
		setTransferEvents
	} = useSyncsStore(
		useCallback(
			state => ({
				setSelectedSync: state.setSelectedSync,
				setChanging: state.setChanging,
				changing: state.changing,
				setCycleState: state.setCycleState,
				setLocalIgnored: state.setLocalIgnored,
				setErrors: state.setErrors,
				setProgress: state.setProgress,
				setRemaining: state.setRemaining,
				setRemoteIgnored: state.setRemoteIgnored,
				setRemainingReadable: state.setRemainingReadable,
				setSpeed: state.setSpeed,
				setTasksBytes: state.setTasksBytes,
				setTasksCount: state.setTasksCount,
				setTasksSize: state.setTasksSize,
				setTransferEvents: state.setTransferEvents
			}),
			[]
		)
	)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const isSyncActive = useIsSyncActive(sync.uuid)

	const syncConfig = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs.filter(pair => pair.uuid === sync.uuid)[0] ?? null
	}, [sync.uuid, desktopConfig])

	const togglePause = useCallback(async () => {
		if (!syncConfig || changing) {
			return
		}

		setChanging(true)

		const toast = loadingToast()

		try {
			const paused = !syncConfig.paused

			await window.desktopAPI.syncUpdatePaused({
				uuid: sync.uuid,
				paused
			})

			await window.desktopAPI.syncResetCache({
				uuid: sync.uuid
			})

			setSelectedSync(prev =>
				prev && prev.uuid === sync.uuid
					? {
							...prev,
							paused
						}
					: prev
			)

			setDesktopConfig(prev => ({
				...prev,
				syncConfig: {
					...prev.syncConfig,
					syncPairs: prev.syncConfig.syncPairs.map(pair => (pair.uuid === sync.uuid ? { ...pair, paused } : pair))
				}
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setChanging(false)

			toast.dismiss()
		}
	}, [syncConfig, sync.uuid, setDesktopConfig, setChanging, errorToast, loadingToast, setSelectedSync, changing])

	const deleteSync = useCallback(async () => {
		if (changing || isSyncActive) {
			return
		}

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

		setChanging(true)

		const toast = loadingToast()

		try {
			await window.desktopAPI.syncUpdateRemoved({
				uuid: sync.uuid,
				removed: true
			})

			setSelectedSync(null)
			setDesktopConfig(prev => ({
				...prev,
				syncConfig: {
					...prev.syncConfig,
					syncPairs: prev.syncConfig.syncPairs.filter(pair => pair.uuid !== sync.uuid)
				}
			}))
			setCycleState(prev => ({
				...prev,
				[sync.uuid]: {
					state: "cycleExited",
					timestamp: Date.now()
				}
			}))
			setLocalIgnored(prev => ({
				...prev,
				[sync.uuid]: []
			}))
			setRemoteIgnored(prev => ({
				...prev,
				[sync.uuid]: []
			}))
			setProgress(prev => ({
				...prev,
				[sync.uuid]: 0
			}))
			setSpeed(prev => ({
				...prev,
				[sync.uuid]: 0
			}))
			setRemaining(prev => ({
				...prev,
				[sync.uuid]: 0
			}))
			setRemainingReadable(prev => ({
				...prev,
				[sync.uuid]: ""
			}))
			setErrors(prev => ({
				...prev,
				[sync.uuid]: []
			}))
			setTasksBytes(prev => ({
				...prev,
				[sync.uuid]: 0
			}))
			setTasksSize(prev => ({
				...prev,
				[sync.uuid]: 0
			}))
			setTasksCount(prev => ({
				...prev,
				[sync.uuid]: 0
			}))
			setTransferEvents(prev => ({
				...prev,
				[sync.uuid]: []
			}))

			navigate({
				to: "/syncs",
				replace: true,
				resetScroll: true
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setChanging(false)

			toast.dismiss()
		}
	}, [
		setDesktopConfig,
		sync.uuid,
		navigate,
		t,
		setSelectedSync,
		setChanging,
		errorToast,
		loadingToast,
		changing,
		isSyncActive,
		setProgress,
		setSpeed,
		setRemaining,
		setRemainingReadable,
		setTasksBytes,
		setTasksCount,
		setTasksSize,
		setTransferEvents,
		setCycleState,
		setRemoteIgnored,
		setLocalIgnored,
		setErrors
	])

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
					disabled={changing}
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
					disabled={changing || isSyncActive}
				>
					<Delete size={iconSize} />
					{t("contextMenus.syncs.delete")}
				</ContextMenuItem>
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
