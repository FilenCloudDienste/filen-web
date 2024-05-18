import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "@/components/drive"
import List from "./list"

export const FileVersionsDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [item, setItem] = useState<DriveCloudItem | null>(null)

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openFileVersionsDialog", (item: DriveCloudItem) => {
			setItem(item)
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
			<DialogContent className="outline-none focus:outline-none active:outline-none hover:outline-none select-none">
				<DialogTitle>File versions</DialogTitle>
				{item && (
					<div className="flex flex-col">
						<List
							key={item.uuid}
							item={item}
							setItem={setItem}
						/>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
})

export default FileVersionsDialog
