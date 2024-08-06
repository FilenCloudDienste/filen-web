import { useSyncsStore } from "@/stores/syncs.store"
import { useMemo, useCallback } from "react"

export default function useIsSyncActive(uuid?: string): boolean {
	const cycleState = useSyncsStore(useCallback(state => state.cycleState, []))

	const state = useMemo(() => {
		if (!uuid) {
			const keys = Object.keys(cycleState)

			if (keys.length === 0) {
				return false
			}

			return keys.some(
				syncUUID =>
					cycleState[syncUUID]!.state === "cycleProcessingTasksStarted" ||
					cycleState[syncUUID]!.state === "cycleProcessingDeltasStarted" ||
					cycleState[syncUUID]!.state === "cycleWaitingForLocalDirectoryChangesStarted" ||
					cycleState[syncUUID]!.state === "cycleProcessingDeltasDone" ||
					cycleState[syncUUID]!.state === "cycleProcessingTasksDone"
			)
		}

		return cycleState[uuid]
			? cycleState[uuid]!.state === "cycleProcessingTasksStarted" ||
					cycleState[uuid]!.state === "cycleProcessingDeltasStarted" ||
					cycleState[uuid]!.state === "cycleWaitingForLocalDirectoryChangesStarted" ||
					cycleState[uuid]!.state === "cycleProcessingDeltasDone" ||
					cycleState[uuid]!.state === "cycleProcessingTasksDone"
			: false
	}, [cycleState, uuid])

	return state
}
