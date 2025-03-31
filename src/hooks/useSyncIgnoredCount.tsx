import { useSyncsStore } from "@/stores/syncs.store"
import { useMemo, useCallback } from "react"

export default function useSyncIgnoredCount(uuid?: string): number {
	const { localIgnored, remoteIgnored } = useSyncsStore(
		useCallback(
			state => ({
				localIgnored: state.localIgnored,
				remoteIgnored: state.remoteIgnored
			}),
			[]
		)
	)

	const state = useMemo(() => {
		if (!uuid) {
			const localKeys = Object.keys(localIgnored)
			const remoteKeys = Object.keys(remoteIgnored)

			if (localKeys.length + remoteKeys.length === 0) {
				return 0
			}

			return (
				localKeys
					.map(syncUUID => (localIgnored[syncUUID] ? localIgnored[syncUUID].length : 0))
					.reduce((prev, curr) => prev + curr, 0) +
				remoteKeys
					.map(syncUUID => (remoteIgnored[syncUUID] ? remoteIgnored[syncUUID].length : 0))
					.reduce((prev, curr) => prev + curr, 0)
			)
		}

		return (localIgnored[uuid] ? localIgnored[uuid].length : 0) + (remoteIgnored[uuid] ? remoteIgnored[uuid].length : 0)
	}, [localIgnored, remoteIgnored, uuid])

	return state
}
