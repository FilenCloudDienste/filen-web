import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import useSDKConfig from "./useSDKConfig"

export default function useAccount() {
	const sdkConfig = useSDKConfig()

	const query = useQuery({
		queryKey: ["useAccount"],
		queryFn: () => Promise.all([worker.fetchAccount(), worker.fetchSettings()])
	})

	return query.isSuccess
		? {
				config: sdkConfig,
				account: query.data[0],
				settings: query.data[1],
				refetch: query.refetch
			}
		: null
}
