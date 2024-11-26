import { useSyncsStore } from "@/stores/syncs.store"
import { useMemo, useCallback } from "react"

export default function useSyncIssueCount(uuid?: string): number {
	const issues = useSyncsStore(useCallback(state => state.errors, []))

	const state = useMemo(() => {
		if (!uuid) {
			const keys = Object.keys(issues)

			if (keys.length === 0) {
				return 0
			}

			return keys.map(syncUUID => (issues[syncUUID] ? issues[syncUUID]!.length : 0)).reduce((prev, curr) => prev + curr, 0)
		}

		return issues[uuid] ? issues[uuid]!.length : 0
	}, [issues, uuid])

	return state
}
