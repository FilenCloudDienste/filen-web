import { ThemeProvider } from "@/providers/themeProvider"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { memo, useEffect, useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useLocalStorage } from "@uidotdev/usehooks"
import worker from "@/lib/worker"
import createIDBPersister from "@/lib/queryPersister"
import sdk from "@/lib/sdk"
import { register as registerServiceWorker } from "register-service-worker"
import DragSelect from "@/components/dragSelect"
import DropZone from "@/components/dropZone"
import { IS_DESKTOP } from "@/constants"
import ConfirmDialog from "@/components/dialogs/confirm"

if (!IS_DESKTOP) {
	registerServiceWorker("/sw.js", {
		registered: () => {
			console.log("sw.js registered")
		},
		ready: () => {
			console.log("sw.js ready")
		},
		error: err => {
			console.error("sw.js", err)
		}
	})
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnMount: "always",
			refetchOnReconnect: "always",
			refetchOnWindowFocus: "always",
			staleTime: Infinity,
			gcTime: Infinity
		}
	}
})

export const queryClientPersister = createIDBPersister()

export const Root = memo(() => {
	const [ready, setReady] = useState<boolean>(false)
	const [authed] = useLocalStorage<boolean>("authed", false)
	const sdkConfig = useSDKConfig()

	useEffect(() => {
		if (authed) {
			sdk.init(sdkConfig)

			worker
				.initializeSDK({ config: sdkConfig })
				.then(() => {
					setReady(true)
				})
				.catch(console.error)
		} else {
			setReady(true)
		}
	}, [authed, sdkConfig])

	if (!ready) {
		return null
	}

	return (
		<main className="font-geist overflow-hidden font-light">
			<ThemeProvider>
				<PersistQueryClientProvider
					client={queryClient}
					persistOptions={{ persister: queryClientPersister, maxAge: Infinity }}
				>
					<DropZone>
						<DragSelect>
							<Outlet />
						</DragSelect>
					</DropZone>
					<Toaster />
					<ConfirmDialog />
				</PersistQueryClientProvider>
			</ThemeProvider>
		</main>
	)
})

export const Route = createRootRoute({
	component: Root,
	notFoundComponent: () => <div>404</div>
})
