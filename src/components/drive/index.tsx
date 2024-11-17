import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import { memo, useCallback, useEffect, useMemo } from "react"
import { type CloudItem, type CloudItemShared } from "@filen/sdk"
import List from "./list"
import { type Prettify } from "@/types"
import worker from "@/lib/worker"
import useRouteParent from "@/hooks/useRouteParent"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { promiseAllChunked, dialogsOpen, contextMenusOpen, getCurrentParentDirectoryUUID } from "@/lib/utils"
import { directoryUUIDToNameCache } from "@/cache"
import useErrorToast from "@/hooks/useErrorToast"
import eventEmitter from "@/lib/eventEmitter"
import useAccount from "@/hooks/useAccount"
import useWindowSize from "@/hooks/useWindowSize"
import { DESKTOP_TOPBAR_HEIGHT, IS_DESKTOP } from "@/constants"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import { Link, Star } from "lucide-react"
import { Button } from "../ui/button"

export type DriveCloudItem = Prettify<
	CloudItem &
		CloudItemShared & {
			selected: boolean
		}
>

export const Drive = memo(() => {
	const parent = useRouteParent()
	const { setItems, searchTerm } = useDriveItemsStore(
		useCallback(state => ({ setItems: state.setItems, searchTerm: state.searchTerm }), [])
	)
	const { currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId } = useDriveSharedStore(
		state => ({
			currentReceiverEmail: state.currentReceiverEmail,
			currentReceiverId: state.currentReceiverId,
			currentReceivers: state.currentReceivers,
			currentSharerEmail: state.currentSharerEmail,
			currentSharerId: state.currentSharerId
		})
	)
	const errorToast = useErrorToast()
	const account = useAccount()
	const windowSize = useWindowSize()
	const { t } = useTranslation()
	const navigate = useNavigate()

	const activeSubCount = useMemo(() => {
		return account ? account.account.subs.filter(sub => sub.activated === 1 && sub.cancelled === 0).length : 0
	}, [account])

	const listHeight = useMemo(() => {
		return IS_DESKTOP ? windowSize.height - 48 - DESKTOP_TOPBAR_HEIGHT : windowSize.height - 48
	}, [windowSize.height])

	const uploadFiles = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				e.target.value = ""

				return
			}

			const files = e.target.files
			const parentCopy = `${parent}`
			const promises: Promise<void>[] = []

			for (const file of files) {
				promises.push(
					new Promise((resolve, reject) => {
						worker
							.uploadFile({
								file: file,
								parent: parentCopy,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers
							})
							.then(item => {
								if (item.parent === getCurrentParentDirectoryUUID()) {
									setItems(prev => [
										...prev.filter(
											prevItem =>
												prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()
										),
										item
									])
								}

								resolve()
							})
							.catch(reject)
					})
				)
			}

			try {
				await promiseAllChunked(promises)
			} catch (e) {
				if (e instanceof Error && e.message.toLowerCase().includes("maximum storage reached")) {
					eventEmitter.emit("openStorageDialog")

					return
				}

				if (e instanceof Error && !e.message.toLowerCase().includes("abort")) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				e.target.value = ""
			}
		},
		[currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId, setItems, parent, errorToast]
	)

	const uploadDirectory = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				e.target.value = ""

				return
			}

			const files: { file: File; path: string }[] = []

			for (const file of e.target.files) {
				files.push({
					file,
					path: file.webkitRelativePath
				})
			}

			const parentCopy = `${parent}`

			try {
				const uploadedItems = await worker.uploadDirectory({
					files,
					parent: parentCopy,
					sharerId: currentSharerId,
					sharerEmail: currentSharerEmail,
					receiverEmail: currentReceiverEmail,
					receiverId: currentReceiverId,
					receivers: currentReceivers
				})

				for (const item of uploadedItems) {
					if (item.type === "directory") {
						directoryUUIDToNameCache.set(item.uuid, item.name)
					}

					if (item.parent === getCurrentParentDirectoryUUID()) {
						setItems(prev => [
							...prev.filter(
								prevItem => prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()
							),
							item
						])
					}
				}
			} catch (e) {
				if (e instanceof Error && e.message.toLowerCase().includes("maximum storage reached")) {
					eventEmitter.emit("openStorageDialog")

					return
				}

				if (e instanceof Error && !e.message.toLowerCase().includes("abort")) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				e.target.value = ""
			}
		},
		[currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId, setItems, parent, errorToast]
	)

	const keyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "a" && (e.ctrlKey || e.metaKey) && searchTerm.length === 0 && !dialogsOpen() && !contextMenusOpen()) {
				e.preventDefault()
				e.stopPropagation()

				setItems(prev => prev.map(prevItem => ({ ...prevItem, selected: true })))

				return
			}
		},
		[setItems, searchTerm]
	)

	const upgradeNow = useCallback(() => {
		navigate({
			to: "/settings/$type",
			params: {
				type: "plans"
			}
		})
	}, [navigate])

	useEffect(() => {
		window.addEventListener("keydown", keyDownListener)

		return () => {
			window.removeEventListener("keydown", keyDownListener)
		}
	}, [keyDownListener])

	return (
		<RequireAuth>
			<MainContainer>
				<input
					type="file"
					id="folder-input"
					multiple={true}
					// @ts-expect-error Not typed
					directory=""
					webkitdirectory=""
					mozdirectory=""
					onChange={uploadDirectory}
					className="hidden"
				/>
				<input
					type="file"
					id="file-input"
					multiple={true}
					onChange={uploadFiles}
					className="hidden"
				/>
				<div className="w-full h-full flex flex-col select-none">
					{parent.includes("links") && account && activeSubCount === 0 ? (
						<div
							className="flex flex-col items-center justify-center p-4 w-full gap-2"
							style={{
								height: listHeight
							}}
						>
							<div className="flex flex-row items-center justify-center w-full h-full">
								<div className="flex flex-col p-4 justify-center items-center">
									<Link
										width={128}
										height={128}
										className="text-muted-foreground"
									/>
									<p className="text-xl text-center mt-4">{t("drive.linksNoSub.subscriptionNeeded")}</p>
									<p className="text-muted-foreground text-center">{t("drive.linksNoSub.description")}</p>
									<Button
										variant="secondary"
										className="items-center gap-2 mt-4"
										onClick={upgradeNow}
									>
										<Star size={16} />
										{t("drive.linksNoSub.upgradeNow")}
									</Button>
								</div>
							</div>
						</div>
					) : (
						<List />
					)}
				</div>
			</MainContainer>
		</RequireAuth>
	)
})

export default Drive
