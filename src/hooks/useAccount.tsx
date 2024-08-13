import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import eventEmitter from "@/lib/eventEmitter"
import { useEffect, useCallback } from "react"
import { useUserStore } from "@/stores/user.store"

export default function useAccount(setupRefetchListener: boolean = true) {
	const { setAccount, setSettings } = useUserStore(
		useCallback(state => ({ setAccount: state.setAccount, setSettings: state.setSettings }), [])
	)

	const query = useQuery({
		queryKey: ["useAccount"],
		queryFn: () => Promise.all([worker.fetchAccount(), worker.fetchSettings()])
	})

	useEffect(() => {
		if (!query.isSuccess) {
			return
		}

		setAccount(query.data[0])
		setSettings(query.data[1])
	}, [query.isSuccess, query.data, setAccount, setSettings])

	useEffect(() => {
		if (!setupRefetchListener) {
			return
		}

		const listener = eventEmitter.on("useAccountRefetch", () => {
			query.refetch().catch(console.error)
		})

		return () => {
			listener.remove()
		}
	}, [query, setupRefetchListener])

	return query.isSuccess
		? {
				account: query.data[0],
				settings: query.data[1],
				refetch: query.refetch
			}
		: null
}
