import { useQuery } from "@tanstack/react-query"
import { IS_DESKTOP } from "@/constants"
import { useMemo } from "react"

export default function useNetworkDriveStats() {
	const query = useQuery({
		queryKey: ["networkDriveStats"],
		queryFn: () => (IS_DESKTOP ? window.desktopAPI.networkDriveStats() : Promise.resolve(null)),
		refetchInterval: 1000,
		refetchIntervalInBackground: true,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true
	})

	const uploadsInProgress = useMemo(() => {
		if (!query.isSuccess || query.data === null) {
			return 0
		}

		return query.data.uploadsInProgress + query.data.uploadsQueued
	}, [query.isSuccess, query.data])

	const speed = useMemo(() => {
		if (!query.isSuccess || query.data === null || query.data.transfers.length === 0) {
			return 0
		}

		return Math.max(...query.data.transfers.map(transfer => transfer.speed))
	}, [query.isSuccess, query.data])

	return {
		uploadsInProgress,
		speed
	}
}
