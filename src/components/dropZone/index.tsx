import { memo, useCallback, useState, useTransition } from "react"
import worker from "@/lib/worker"
import useRouteParent from "@/hooks/useRouteParent"
import { Dialog, DialogContent, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { readLocalDroppedDirectory } from "./utils"
import { promiseAllChunked } from "@/lib/utils"
import useDriveURLState from "@/hooks/useDriveURLState"
import useLocation from "@/hooks/useLocation"

export const DropZone = memo(({ children }: { children: React.ReactNode }) => {
	const parent = useRouteParent()
	const [showModal, setShowModal] = useState<boolean>(false)
	const { t } = useTranslation()
	const { setItems } = useDriveItemsStore()
	const { currentReceiverId, currentSharerId, currentReceiverEmail, currentReceivers, currentSharerEmail } = useDriveSharedStore()
	const [, startTransition] = useTransition()
	const driveURLState = useDriveURLState()
	const location = useLocation()

	const handleShow = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (!location.includes("drive")) {
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
		[location]
	)

	const onDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (
				driveURLState.favorites ||
				driveURLState.links ||
				driveURLState.recents ||
				driveURLState.sharedIn ||
				driveURLState.sharedOut ||
				driveURLState.trash
			) {
				return
			}

			handleShow(e)
		},
		[handleShow, driveURLState]
	)

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		setShowModal(false)
	}, [])

	const onDragEnter = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (
				driveURLState.favorites ||
				driveURLState.links ||
				driveURLState.recents ||
				driveURLState.sharedIn ||
				driveURLState.sharedOut ||
				driveURLState.trash ||
				!location.includes("drive")
			) {
				return
			}

			handleShow(e)
		},
		[handleShow, driveURLState, location]
	)

	const onDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			if (
				driveURLState.favorites ||
				driveURLState.links ||
				driveURLState.recents ||
				driveURLState.sharedIn ||
				driveURLState.sharedOut ||
				driveURLState.trash ||
				!location.includes("drive")
			) {
				return
			}

			setShowModal(false)

			if (e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				const parentCopy = `${parent}`

				const files = await readLocalDroppedDirectory(e.dataTransfer.items)
				const promises: Promise<void>[] = []
				const containsDirectories = files.some(file => file.webkitRelativePath.split("/").length >= 2)

				if (containsDirectories) {
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

										resolve()
									})
									.catch(reject)
							})
						)
					}
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

										resolve()
									})
									.catch(reject)
							})
						)
					}
				}

				await promiseAllChunked(promises)
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
			driveURLState,
			location
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
										className="border border-dashed w-full h-full rounded-lg flex flex-col items-center justify-center"
									>
										{t("dropZone.cta")}
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
