import { memo, useState, useEffect, useCallback, useMemo } from "react"
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
import useAccount from "@/hooks/useAccount"
import { Loader } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"

export const PublicLinkDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [item, setItem] = useState<DriveCloudItem | null>(null)
	const [saving, setSaving] = useState<boolean>(false)
	const [showSave, setShowSave] = useState<boolean>(false)
	const account = useAccount()
	const navigate = useNavigate()

	const activeSubCount = useMemo(() => {
		return account ? account.account.subs.filter(sub => sub.activated === 1).length : 0
	}, [account])

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const save = useCallback(() => {
		eventEmitter.emit("savePublicLink")
	}, [])

	const upgradeNow = useCallback(() => {
		close()

		navigate({
			to: "/settings/$type",
			params: {
				type: "plans"
			}
		})
	}, [navigate, close])

	useEffect(() => {
		const listener = eventEmitter.on("openPublicLinkDialog", (itm: DriveCloudItem) => {
			eventEmitter.emit("useAccountRefetch")

			setItem(itm)
			setShowSave(false)
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
					{item ? (
						account ? (
							activeSubCount > 0 ? (
								<>
									{item.type === "file" ? (
										<File
											key={item.uuid}
											item={item}
											setOpen={setOpen}
											saving={saving}
											setSaving={setSaving}
											setShowSave={setShowSave}
										/>
									) : (
										<Directory
											key={item.uuid}
											item={item}
											setOpen={setOpen}
											saving={saving}
											setSaving={setSaving}
											setShowSave={setShowSave}
										/>
									)}
								</>
							) : (
								<div className="flex flex-col gap-2 py-4">
									<p className="text-muted-foreground text-sm">{t("dialogs.publicLink.subscriptionNeeded")}</p>
									<p
										className="text-blue-500 hover:underline cursor-pointer text-sm"
										onClick={upgradeNow}
									>
										{t("dialogs.publicLink.upgradeNow")}
									</p>
								</div>
							)
						) : (
							<div className="flex flex-row items-center justify-center min-h-32">
								<Loader className="animate-spin-medium" />
							</div>
						)
					) : (
						<div className="flex flex-row items-center justify-center min-h-32">
							<Loader className="animate-spin-medium" />
						</div>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={close}>{t("dialogs.publicLink.close")}</AlertDialogCancel>
					{showSave && (
						<Button
							onClick={save}
							disabled={saving}
						>
							{t("dialogs.publicLink.save")}
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default PublicLinkDialog
