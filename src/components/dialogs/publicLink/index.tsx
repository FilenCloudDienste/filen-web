import { memo, useState, useEffect, useCallback } from "react"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "../../drive"
import { Button } from "@/components/ui/button"
import File from "./file"
import Directory from "./directory"

export const PublicLinkDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [item, setItem] = useState<DriveCloudItem | null>(null)
	const [saving, setSaving] = useState<boolean>(false)

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const save = useCallback(() => {
		eventEmitter.emit("savePublicLink")
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openPublicLinkDialog", (itm: DriveCloudItem) => {
			setItem(itm)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<AlertDialog open={open}>
			<AlertDialogContent
				onEscapeKeyDown={close}
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("dialogs.publicLink.title")}</AlertDialogTitle>
					<AlertDialogDescription>{t("dialogs.publicLink.description")}</AlertDialogDescription>
					{item && (
						<>
							{item.type === "file" ? (
								<File
									key={item.uuid}
									item={item}
									setOpen={setOpen}
									saving={saving}
									setSaving={setSaving}
								/>
							) : (
								<Directory
									key={item.uuid}
									item={item}
									setOpen={setOpen}
									saving={saving}
									setSaving={setSaving}
								/>
							)}
						</>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={close}>{t("dialogs.publicLink.close")}</AlertDialogCancel>
					<Button
						onClick={save}
						disabled={saving}
					>
						{t("dialogs.publicLink.save")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default PublicLinkDialog
