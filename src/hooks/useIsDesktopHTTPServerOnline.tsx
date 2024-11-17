import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { IS_DESKTOP, DESKTOP_HTTP_SERVER_PORT } from "@/constants"

export default function useIsDesktopHTTPServerOnline(): boolean {
	const query = useQuery({
		queryKey: ["useIsDesktopHTTPServerOnline"],
		queryFn: () =>
			IS_DESKTOP
				? worker.httpHealthCheck({
						url: `http://localhost:${DESKTOP_HTTP_SERVER_PORT}/ping`,
						expectedStatusCode: 200,
						method: "GET",
						timeout: 5000
					})
				: Promise.resolve(false),
		refetchInterval: 5000,
		refetchIntervalInBackground: true,
		refetchOnMount: true,
		refetchOnReconnect: true,
		refetchOnWindowFocus: true
	})

	return query.isSuccess ? query.data : false
}
