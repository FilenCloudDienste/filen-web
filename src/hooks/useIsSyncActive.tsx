import { useSyncsStore } from "@/stores/syncs.store"
import { useMemo, useCallback } from "react"
import useDesktopConfig from "./useDesktopConfig"

export default function useIsSyncActive(uuid?: string): boolean {
	const cycleState = useSyncsStore(useCallback(state => state.cycleState, []))
	const [desktopConfig] = useDesktopConfig()

	const state = useMemo(() => {
		if (!uuid) {
			const keys = Object.keys(cycleState)

			if (keys.length === 0) {
				return false
			}

			return (
				keys.some(
					syncUUID =>
						cycleState[syncUUID]?.state === "cycleProcessingTasksStarted" ||
						cycleState[syncUUID]?.state === "cycleProcessingDeltasStarted" ||
						cycleState[syncUUID]?.state === "cycleWaitingForLocalDirectoryChangesStarted" ||
						cycleState[syncUUID]?.state === "cycleProcessingDeltasDone" ||
						cycleState[syncUUID]?.state === "cycleProcessingTasksDone" ||
						cycleState[syncUUID]?.state === "cycleGettingTreesStarted" ||
						cycleState[syncUUID]?.state === "cycleSavingStateStarted" ||
						cycleState[syncUUID]?.state === "cycleApplyingStateStarted"
				) && desktopConfig.syncConfig.syncPairs.some(pair => !pair.paused)
			)
		}

		return cycleState[uuid]
			? (cycleState[uuid]?.state === "cycleProcessingTasksStarted" ||
					cycleState[uuid]?.state === "cycleProcessingDeltasStarted" ||
					cycleState[uuid]?.state === "cycleWaitingForLocalDirectoryChangesStarted" ||
					cycleState[uuid]?.state === "cycleProcessingDeltasDone" ||
					cycleState[uuid]?.state === "cycleProcessingTasksDone" ||
					cycleState[uuid]?.state === "cycleGettingTreesStarted" ||
					cycleState[uuid]?.state === "cycleSavingStateStarted" ||
					cycleState[uuid]?.state === "cycleApplyingStateStarted") &&
					desktopConfig.syncConfig.syncPairs.some(pair => pair.uuid === uuid && !pair.paused)
			: false
	}, [cycleState, uuid, desktopConfig.syncConfig.syncPairs])

	return state
}
