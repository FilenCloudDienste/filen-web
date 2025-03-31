import { useSyncsStore, type ConfirmDeletion } from "@/stores/syncs.store"
import { useMemo, useCallback } from "react"

export default function useSyncConfirmDeletion(uuid?: string): ConfirmDeletion[] {
	const { confirmDeletion } = useSyncsStore(
		useCallback(
			state => ({
				confirmDeletion: state.confirmDeletion
			}),
			[]
		)
	)

	const state = useMemo(() => {
		if (!uuid) {
			const keys = Object.keys(confirmDeletion)

			if (keys.length === 0) {
				return []
			}

			const found = keys.map(syncUUID => confirmDeletion[syncUUID] ?? null).filter(item => item !== null)

			return found
		}

		return confirmDeletion[uuid] && confirmDeletion[uuid] !== null ? [confirmDeletion[uuid]] : []
	}, [confirmDeletion, uuid])

	return state
}
