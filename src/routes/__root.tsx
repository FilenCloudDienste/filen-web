import { ThemeProvider } from "@/providers/themeProvider"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { memo, useEffect, useState, useRef } from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, focusManager } from "@tanstack/react-query"
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
import SelectContactsDialog from "@/components/dialogs/selectContacts"
import TransparentFullScreenImageDialog from "@/components/dialogs/transparentFullScreenImage"
import TwoFactorCodeDialog from "@/components/dialogs/twoFactorCode"
import PublicLinkDialog from "@/components/dialogs/publicLink"
import SharedWithDialog from "@/components/dialogs/sharedWith"
import { IS_DESKTOP, UNCACHED_QUERY_KEYS } from "@/constants"
import NotificationHandler from "@/components/notificationHandler"
import ActivityHandler from "@/components/activityHandler"
import FileVersionsDialog from "@/components/dialogs/fileVersions"
import NoteHistoryDialog from "@/components/dialogs/noteHistory"
import NoteParticipantsDialog from "@/components/dialogs/noteParticipants"
import { type FilenSDKConfig } from "@filen/sdk"

focusManager.setEventListener(handleFocus => {
	const onFocus = () => {
		handleFocus(true)
	}

	const onBlur = () => {
		handleFocus(false)
	}

	window.addEventListener("focus", () => onFocus, false)
	window.addEventListener("blur", () => onBlur, false)

	return () => {
		window.removeEventListener("focus", onFocus)
		window.removeEventListener("blur", onBlur)
	}
})

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
		if (!initRef.current) {
			initRef.current = true

			const initConfig = authed
				? sdkConfig
				: ({
						email: "anonymous",
						password: "anonymous",
						masterKeys: ["anonymous"],
						connectToSocket: true,
						metadataCache: true,
						twoFactorCode: "anonymous",
						publicKey: "anonymous",
						privateKey: "anonymous",
						apiKey: "anonymous",
						authVersion: 2,
						baseFolderUUID: "anonymous",
						userId: 1
					} satisfies FilenSDKConfig)

			sdk.init(initConfig)

			setItem("sdkConfig", initConfig)
				.then(() => {
					Promise.all([
						worker.initializeSDK({ config: initConfig }),
						IS_DESKTOP ? window.desktopAPI.initSDK(initConfig) : Promise.resolve(),
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
										<ActivityHandler>
											<Outlet />
										</ActivityHandler>
									</NotificationHandler>
								</DragSelect>
							</DropZone>
							<SelectDriveItemDialog />
							<SelectContactsDialog />
							<PublicLinkDialog />
							<SharedWithDialog />
							<FileVersionsDialog />
							<NoteHistoryDialog />
							<NoteParticipantsDialog />
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
