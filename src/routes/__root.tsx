import { ThemeProvider } from "@/providers/themeProvider"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { memo, useEffect, useState, useRef } from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider, type PersistQueryClientOptions } from "@tanstack/react-query-persist-client"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useLocalStorage } from "@uidotdev/usehooks"
import worker from "@/lib/worker"
import createIDBPersister from "@/lib/queryPersister"
import sdk from "@/lib/sdk"
import DragSelect from "@/components/dragSelect"
import DropZone from "@/components/dropZone"
import ConfirmDialog from "@/components/dialogs/confirm"
import SelectDriveItemDialog from "@/components/dialogs/selectDriveItem"
import Transfers from "@/components/transfers"
import PreviewDialog from "@/components/dialogs/previewDialog"
import { register as registerServiceWorker } from "register-service-worker"
import { setItem } from "@/lib/localForage"
import InputDialog from "@/components/dialogs/input"
import { connect as socketConnect } from "@/lib/socket"
import SelectContactsDialog from "@/components/dialogs/selectContacts"
import TransparentFullScreenImageDialog from "@/components/dialogs/transparentFullScreenImage"
import TwoFactorCodeDialog from "@/components/dialogs/twoFactorCodeDialog"
import PublicLinkDialog from "@/components/dialogs/publicLink"
import SharedWithDialog from "@/components/dialogs/sharedWith"
import { IS_DESKTOP } from "@/constants"
import NotificationHandler from "@/components/notificationHandler"

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

export const queryClientPersister = createIDBPersister()
export const UNCACHED_QUERY_KEYS = ["chatYouTubeEmbedInfo", "directoryPublicLinkStatus", "filePublicLinkStatus"]

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
	persister: queryClientPersister,
	maxAge: Infinity,
	dehydrateOptions: {
		shouldDehydrateQuery(query) {
			return query.queryKey.some(queryKey => UNCACHED_QUERY_KEYS.includes(queryKey as unknown as string))
		}
	}
}

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
							IS_DESKTOP ? window.desktopAPI.initSDK(sdkConfig) : Promise.resolve(),
							!IS_DESKTOP && "serviceWorker" in navigator
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
		<main className="font-geist overflow-hidden transform-gpu antialiased">
			<ThemeProvider>
				<PersistQueryClientProvider
					client={persistantQueryClient}
					persistOptions={persistOptions}
				>
					{authed ? (
						<>
							<DropZone>
								<DragSelect>
									<NotificationHandler>
										<Outlet />
									</NotificationHandler>
								</DragSelect>
							</DropZone>
							<SelectDriveItemDialog />
							<SelectContactsDialog />
							<PublicLinkDialog />
							<SharedWithDialog />
						</>
					) : (
						<Outlet />
					)}
					<Transfers />
					<PreviewDialog />
					<InputDialog />
					<ConfirmDialog />
					<TransparentFullScreenImageDialog />
					<TwoFactorCodeDialog />
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
