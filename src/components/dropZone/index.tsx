import { memo, useCallback, useState } from "react"
import worker from "@/lib/worker"
import useRouteParent from "@/hooks/useRouteParent"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogPortal, DialogOverlay, DialogFooter } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"

export const DropZone = memo(({ children }: { children: React.ReactNode }) => {
	const parent = useRouteParent()
	const [showModal, setShowModal] = useState<boolean>(false)
	const { t } = useTranslation()

	const handleShow = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
	}, [])

	const onDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			handleShow(e)
		},
		[handleShow]
	)

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		setShowModal(false)
	}, [])

	const onDragEnter = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			handleShow(e)
		},
		[handleShow]
	)

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()

			setShowModal(false)

			if (e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				worker.uploadFile({ file: e.dataTransfer.files[0], parent })
			}
		},
		[parent]
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
							className="w-[300px] h-[300px] no-close-button"
						>
							<DialogDescription
								onDragOver={onDragOver}
								onDragLeave={onDragLeave}
								onDragEnter={onDragEnter}
								className="p-4"
							>
								<div
									onDragOver={onDragOver}
									onDragLeave={onDragLeave}
									onDragEnter={onDragEnter}
									className="border border-dashed w-full h-full rounded-lg flex flex-col items-center justify-center"
								>
									{t("dropZone.cta")}
								</div>
							</DialogDescription>
						</DialogContent>
						<DialogHeader
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
							onDragEnter={onDragEnter}
						></DialogHeader>
						<DialogFooter
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
							onDragEnter={onDragEnter}
						/>
					</DialogOverlay>
				</DialogPortal>
			</Dialog>
			{children}
		</div>
	)
})

export default DropZone
