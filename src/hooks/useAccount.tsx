import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import useSDKConfig from "./useSDKConfig"
import eventEmitter from "@/lib/eventEmitter"
import { useEffect } from "react"

export default function useAccount() {
	const sdkConfig = useSDKConfig()

	const query = useQuery({
		queryKey: ["useAccount"],
		queryFn: () => Promise.all([worker.fetchAccount(), worker.fetchSettings()])
	})

	useEffect(() => {
		const listener = eventEmitter.on("useAccountRefetch", () => {
			query.refetch().catch(console.error)
		})

		return () => {
			listener.remove()
		}
	}, [query])

	return query.isSuccess
		? {
				config: sdkConfig,
				account: query.data[0],
				settings: query.data[1],
				refetch: query.refetch
			}
		: null
}
