import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "@/components/drive"
import Content from "./content"

export const InfoDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [item, setItem] = useState<DriveCloudItem | null>(null)

	const preventDefault = useCallback((e: Event) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openInfoDialog", (i: DriveCloudItem) => {
			setItem(i)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogContent
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
				id="info-content"
				onOpenAutoFocus={preventDefault}
			>
				<DialogHeader />
				{item && <Content item={item} />}
				<DialogFooter />
			</DialogContent>
		</Dialog>
	)
})

export default InfoDialog
