import { memo, useState, useEffect, useCallback } from "react"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import eventEmitter from "@/lib/eventEmitter"
import { useNavigate } from "@tanstack/react-router"

export const StorageDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const navigate = useNavigate()

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const upgrade = useCallback(() => {
		close()

		navigate({
			to: "/settings/$type",
			params: {
				type: "plans"
			}
		})
	}, [navigate, close])

	const preventDefault = useCallback((e: Event) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openStorageDialog", () => {
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<AlertDialog open={open}>
			<AlertDialogContent
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
				onOpenAutoFocus={preventDefault}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("dialogs.storage.title")}</AlertDialogTitle>
				</AlertDialogHeader>
				<p className="text-muted-foreground">{t("dialogs.storage.info")}</p>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={close}>{t("dialogs.storage.dismiss")}</AlertDialogCancel>
					<Button
						variant="default"
						onClick={upgrade}
					>
						{t("dialogs.storage.upgrade")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default StorageDialog
