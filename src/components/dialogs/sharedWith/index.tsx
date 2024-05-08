import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { type DriveCloudItem } from "../../drive"
import { Button } from "@/components/ui/button"
import List from "./list"

export const SharedWithDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [item, setItem] = useState<DriveCloudItem | null>(null)
	const { t } = useTranslation()

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openSharedWithDialog", (itm: DriveCloudItem) => {
			setItem(itm)
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
			<DialogContent className="outline-none focus:outline-none active:outline-none hover:outline-none">
				<DialogHeader>{t("dialogs.sharedWith.title")}</DialogHeader>
				{item && (
					<List
						item={item}
						setItem={setItem}
						setOpen={setOpen}
					/>
				)}
				<DialogFooter>
					<Button
						onClick={close}
						variant="outline"
					>
						{t("dialogs.sharedWith.close")}
					</Button>
					<Button onClick={close}>{t("dialogs.sharedWith.add")}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

export default SharedWithDialog
