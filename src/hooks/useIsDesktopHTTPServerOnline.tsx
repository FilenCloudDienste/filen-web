import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { IS_DESKTOP, DESKTOP_HTTP_SERVER_PORT } from "@/constants"

export async function isDesktopHTTPServerOnline(): Promise<boolean> {
	return IS_DESKTOP
		? await worker.httpHealthCheck({
				url: `http://localhost:${DESKTOP_HTTP_SERVER_PORT}/ping`,
				expectedStatusCode: 200,
				method: "GET",
				timeout: 5000
			})
		: false
}

export default function useIsDesktopHTTPServerOnline(): boolean {
	const query = useQuery({
		queryKey: ["useIsDesktopHTTPServerOnline"],
		queryFn: () => isDesktopHTTPServerOnline(),
		refetchInterval: 15000,
		refetchIntervalInBackground: true,
		refetchOnMount: true,
		refetchOnReconnect: true,
		refetchOnWindowFocus: true
	})

	return query.isSuccess ? query.data : false
}
