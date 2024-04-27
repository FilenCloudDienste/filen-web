import { ThemeProvider } from "@/providers/themeProvider"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { memo, useEffect, useState, useRef } from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useLocalStorage } from "@uidotdev/usehooks"
import worker from "@/lib/worker"
import createIDBPersister from "@/lib/queryPersister"
import sdk from "@/lib/sdk"
import DragSelect from "@/components/dragSelect"
import DropZone from "@/components/dropZone"
import ConfirmDialog from "@/components/dialogs/confirm"
import SelectDriveDestinationDialog from "@/components/dialogs/selectDriveDestination"
import Transfers from "@/components/transfers"
import PreviewDialog from "@/components/dialogs/previewDialog"
import { register as registerServiceWorker } from "register-service-worker"
import { setItem } from "@/lib/localForage"
import InputDialog from "@/components/dialogs/input"
import { connect as socketConnect } from "@/lib/socket"
import SelectContactsDialog from "@/components/dialogs/selectContacts"

export const persistantQueryClient = new QueryClient({
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

export const sessionQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnMount: "always",
			refetchOnReconnect: "always",
			refetchOnWindowFocus: "always"
		}
	}
})

export const queryClientPersister = createIDBPersister()

export const Root = memo(() => {
	const [ready, setReady] = useState<boolean>(false)
	const [authed] = useLocalStorage<boolean>("authed", false)
	const sdkConfig = useSDKConfig()
	const initRef = useRef<boolean>(false)

	useEffect(() => {
		if (authed) {
			if (!initRef.current) {
				initRef.current = true

				sdk.init(sdkConfig)

				socketConnect({ apiKey: sdkConfig.apiKey })

				setItem("sdkConfig", sdkConfig)
					.then(() => {
						Promise.all([
							worker.initializeSDK({ config: sdkConfig }),
							"serviceWorker" in navigator
								? new Promise<void>(resolve => {
										registerServiceWorker("/sw.js", {
											registrationOptions: {
												scope: "/"
											},
											ready: registration => {
												console.log("ServiceWorker ready")

												navigator.serviceWorker.addEventListener("message", event => {
													console.log("SW message", event.data)
												})

												registration.update().catch(console.error)

												resolve()
											},
											registered: registration => {
												console.log("ServiceWorker registered")

												registration.update().catch(console.error)

												resolve()
											},
											error: err => {
												console.error(err)

												resolve()
											}
										})
									})
								: Promise.resolve()
						])
							.then(() => {
								setReady(true)
							})
							.catch(console.error)
					})
					.catch(console.error)
			}
		} else {
			setReady(true)
		}
	}, [authed, sdkConfig])

	if (!ready) {
		return null
	}

	return (
		<main className="font-geist overflow-hidden font-light transform-gpu antialiased">
			<ThemeProvider>
				<PersistQueryClientProvider
					client={persistantQueryClient}
					persistOptions={{ persister: queryClientPersister, maxAge: Infinity }}
				>
					{authed ? (
						<>
							<DropZone>
								<DragSelect>
									<Outlet />
								</DragSelect>
							</DropZone>
							<Transfers />
							<SelectDriveDestinationDialog />
							<PreviewDialog />
							<InputDialog />
							<ConfirmDialog />
							<SelectContactsDialog />
						</>
					) : (
						<Outlet />
					)}
					<Toaster />
				</PersistQueryClientProvider>
			</ThemeProvider>
		</main>
	)
})

export const Route = createRootRoute({
	component: Root,
	notFoundComponent: () => <div>404</div>
})
