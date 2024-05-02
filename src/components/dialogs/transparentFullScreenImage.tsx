import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

export const TransparentFullScreenImageDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [src, setSrc] = useState<string | null>(null)
	const { t } = useTranslation()

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)

		if (!openState) {
			setSrc(null)
		}
	}, [])

	const close = useCallback(() => {
		setOpen(false)
		setSrc(null)
	}, [])

	const stopPropagation = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openTransparentFullScreenImageDialog", ({ src: s }: { src: string }) => {
			setSrc(s)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent
				className="fullscreen-dialog no-close-button outline-none focus:outline-none active:outline-none hover:outline-none bg-transparent flex flex-row items-center justify-center"
				onClick={close}
			>
				<div className="absolute right-5 top-5">
					<div
						className="cursor-pointer bg-primary-foreground rounded-full p-2"
						onClick={close}
					>
						<X />
					</div>
				</div>
				{src && (
					<div className="flex flex-col">
						<img
							src={src}
							className="object-contain max-w-[calc(100vw*0.75)] max-h-[calc(100vh*0.75)]"
							onClick={stopPropagation}
						/>
						<a
							className="line-clamp-1 text-ellipsis break-all text-muted-foreground hover:underline hover:text-primary"
							href={src}
							target="_blank"
							onClick={stopPropagation}
						>
							{t("dialogs.transparentFullScreenImage.openOriginal")}
						</a>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
})

export default TransparentFullScreenImageDialog
