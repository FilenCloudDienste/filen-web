import { memo, useCallback, useState, useTransition } from "react"
import worker from "@/lib/worker"
import useRouteParent from "@/hooks/useRouteParent"
import { Dialog, DialogContent, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { readLocalDroppedDirectory } from "./utils"
import { promiseAllChunked } from "@/lib/utils"
import useLocation from "@/hooks/useLocation"
import useCanUpload from "@/hooks/useCanUpload"
import useErrorToast from "@/hooks/useErrorToast"
import { type DriveCloudItem } from "../drive"
import eventEmitter from "@/lib/eventEmitter"
import useLoadingToast from "@/hooks/useLoadingToast"

export const DropZone = memo(({ children }: { children: React.ReactNode }) => {
	const parent = useRouteParent()
	const [showModal, setShowModal] = useState<boolean>(false)
	const { t } = useTranslation()
	const { setItems } = useDriveItemsStore()
	const { currentReceiverId, currentSharerId, currentReceiverEmail, currentReceivers, currentSharerEmail } = useDriveSharedStore()
	const [, startTransition] = useTransition()
	const location = useLocation()
	const canUpload = useCanUpload()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const handleShow = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (!canUpload) {
				return
			}

			let hasFile = false

			if (e && e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
				for (const item of e.dataTransfer.items) {
					if (item.kind === "file") {
						hasFile = true

						break
					}
				}
			}

			setShowModal(hasFile)
		},
		[canUpload]
	)

	const onDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (!canUpload) {
				return
			}

			handleShow(e)
		},
		[handleShow, canUpload]
	)

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		setShowModal(false)
	}, [])

	const onDragEnter = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (!canUpload) {
				return
			}

			handleShow(e)
		},
		[handleShow, canUpload]
	)

	const onDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (!canUpload) {
				return
			}

			setShowModal(false)

			let toast: ReturnType<typeof loadingToast> | null = null

			try {
				if (e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
					const parentCopy = `${parent}`
					const isChatsUpload = location.includes("chats")
					const files = await readLocalDroppedDirectory(e.dataTransfer.items)
					const promises: Promise<DriveCloudItem[]>[] = []
					const containsDirectories = files.some(file => file.webkitRelativePath.split("/").length >= 2)

					if (containsDirectories) {
						if (isChatsUpload) {
							throw new Error("Cannot attach directories to a chat.")
						}

						const directoryGroups: Record<string, { file: File; webkitRelativePath: string }[]> = {}

						for (const file of files) {
							const ex = file.webkitRelativePath.split("/")
							const dirname = ex[0] ? ex[0] : file.name

							if (!directoryGroups[dirname]) {
								directoryGroups[dirname] = []
							}

							directoryGroups[dirname].push({ file, webkitRelativePath: file.webkitRelativePath })
						}

						for (const basename in directoryGroups) {
							const directoryFiles = directoryGroups[basename]

							promises.push(
								new Promise((resolve, reject) => {
									worker
										.uploadDirectory({
											files: directoryFiles,
											parent: parentCopy,
											sharerId: currentSharerId,
											sharerEmail: currentSharerEmail,
											receiverEmail: currentReceiverEmail,
											receiverId: currentReceiverId,
											receivers: currentReceivers
										})
										.then(uploadedItems => {
											for (const item of uploadedItems) {
												if (item.parent !== parentCopy) {
													continue
												}

												startTransition(() => {
													setItems(prev => [
														...prev.filter(
															prevItem =>
																prevItem.uuid !== item.uuid &&
																prevItem.name.toLowerCase() !== item.name.toLowerCase()
														),
														item
													])
												})
											}

											resolve(uploadedItems)
										})
										.catch(reject)
								})
							)
						}
					} else {
						if (isChatsUpload) {
							promises.push(worker.uploadFilesToChatUploads({ files }))
						} else {
							for (const file of files) {
								promises.push(
									new Promise((resolve, reject) => {
										worker
											.uploadFile({
												file,
												parent: parentCopy,
												sharerId: currentSharerId,
												sharerEmail: currentSharerEmail,
												receiverEmail: currentReceiverEmail,
												receiverId: currentReceiverId,
												receivers: currentReceivers
											})
											.then(item => {
												if (item.parent === parentCopy) {
													startTransition(() => {
														setItems(prev => [
															...prev.filter(
																prevItem =>
																	prevItem.uuid !== item.uuid &&
																	prevItem.name.toLowerCase() !== item.name.toLowerCase()
															),
															item
														])
													})
												}

												resolve([item])
											})
											.catch(reject)
									})
								)
							}
						}
					}

					const uploadedFiles = (await promiseAllChunked(promises)).flat(999999999)

					if (isChatsUpload) {
						const filesWithLinkUUIDs: { file: DriveCloudItem; linkUUID: string }[] = []

						toast = loadingToast()

						await promiseAllChunked(
							uploadedFiles.map(
								file =>
									new Promise<void>((resolve, reject) => {
										worker
											.enablePublicLink({ type: file.type, uuid: file.uuid })
											.then(linkUUID => {
												filesWithLinkUUIDs.push({
													file,
													linkUUID
												})

												resolve()
											})
											.catch(reject)
									})
							)
						)

						eventEmitter.emit("attachFilesToChat", filesWithLinkUUIDs)
					}
				}
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				if (toast) {
					toast.dismiss()
				}
			}
		},
		[
			parent,
			setItems,
			currentReceiverEmail,
			currentReceiverId,
			currentReceivers,
			currentSharerEmail,
			currentSharerId,
			canUpload,
			location,
			errorToast,
			loadingToast
		]
	)

	return (
		<div
			className="h-full w-full flex flex-col"
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDragEnter={onDragEnter}
			onDrop={onDrop}
		>
			<Dialog open={showModal}>
				<DialogPortal>
					<DialogOverlay
						onDragOver={onDragOver}
						onDragLeave={onDragLeave}
						onDragEnter={onDragEnter}
						className="bg-transparent"
					>
						<DialogContent
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
							onDragEnter={onDragEnter}
							className="w-[300px] h-[300px] no-close-button outline-none focus:outline-none active:outline-none hover:outline-none"
						>
							<DialogDescription asChild={true}>
								<div
									onDragOver={onDragOver}
									onDragLeave={onDragLeave}
									onDragEnter={onDragEnter}
									className="w-full h-full flex flex-col items-center justify-center p-4"
								>
									<div
										onDragOver={onDragOver}
										onDragLeave={onDragLeave}
										onDragEnter={onDragEnter}
										className="border border-dashed w-full h-full rounded-md flex flex-col items-center justify-center"
									>
										{location.includes("chats") ? t("dropZone.chatsCta") : t("dropZone.cta")}
									</div>
								</div>
							</DialogDescription>
						</DialogContent>
					</DialogOverlay>
				</DialogPortal>
			</Dialog>
			{children}
		</div>
	)
})

export default DropZone
