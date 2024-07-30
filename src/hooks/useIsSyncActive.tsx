import { useSyncsStore } from "@/stores/syncs.store"
import { useMemo } from "react"

export default function useIsSyncActive(uuid?: string): boolean {
	const { cycleState } = useSyncsStore()

	const state = useMemo(() => {
		if (!uuid) {
			const keys = Object.keys(cycleState)

			if (keys.length === 0) {
				return false
			}

			return keys.some(
				syncUUID =>
					cycleState[syncUUID] === "cycleApplyingStateStarted" ||
					cycleState[syncUUID] === "cycleProcessingTasksStarted" ||
					cycleState[syncUUID] === "cycleProcessingDeltasStarted" ||
					cycleState[syncUUID] === "cycleWaitingForLocalDirectoryChangesStarted" ||
					cycleState[syncUUID] === "cycleSavingStateStarted"
			)
		}

		return cycleState[uuid]
			? cycleState[uuid] === "cycleApplyingStateStarted" ||
					cycleState[uuid] === "cycleProcessingTasksStarted" ||
					cycleState[uuid] === "cycleProcessingDeltasStarted" ||
					cycleState[uuid] === "cycleWaitingForLocalDirectoryChangesStarted" ||
					cycleState[uuid] === "cycleSavingStateStarted"
			: false
	}, [cycleState, uuid])

	return state
}
