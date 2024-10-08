import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "@/components/drive"
import List from "./list"
import { useTranslation } from "react-i18next"

export const FileVersionsDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [item, setItem] = useState<DriveCloudItem | null>(null)
	const { t } = useTranslation()

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)
	}, [])

	const preventDefault = useCallback((e: Event) => {
		e.preventDefault()
		e.stopPropagation()
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
			<DialogContent
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
				onOpenAutoFocus={preventDefault}
			>
				<DialogTitle>{t("dialogs.fileVersions.title")}</DialogTitle>
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
