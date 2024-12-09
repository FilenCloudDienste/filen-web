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
import { IS_DESKTOP } from "@/constants"
import useErrorToast from "@/hooks/useErrorToast"
import { Loader } from "lucide-react"
import { useMiscStore } from "@/stores/misc.store"

export const DesktopUpdateDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [isUpdating, setIsUpdating] = useState<boolean>(false)
	const errorToast = useErrorToast()
	const { t } = useTranslation()
	const [version, setVersion] = useState<string>("1")
	const [desktopUpdateDialogDismissedVersions, setDesktopUpdateDialogDismissedVersions] = useState<Record<string, boolean>>({})
	const setUpdateDialogOpen = useMiscStore(useCallback(state => state.setUpdateDialogOpen, []))
	const isOnlineDialogOpen = useMiscStore(useCallback(state => state.isOnlineDialogOpen, []))
	const maintenanceDialogOpen = useMiscStore(useCallback(state => state.maintenanceDialogOpen, []))
	const lockDialogOpen = useMiscStore(useCallback(state => state.lockDialogOpen, []))

	const dismiss = useCallback(() => {
		if (isUpdating) {
			return
		}

		setDesktopUpdateDialogDismissedVersions(prev => ({
			...prev,
			[version]: true
		}))

		setOpen(false)
	}, [version, setDesktopUpdateDialogDismissedVersions, isUpdating])

	const update = useCallback(async () => {
		setDesktopUpdateDialogDismissedVersions(prev => ({
			...prev,
			[version]: true
		}))

		setOpen(true)
		setIsUpdating(true)

		try {
			await window.desktopAPI.installUpdate()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [setDesktopUpdateDialogDismissedVersions, version, errorToast])

	const onUpdateDownloaded = useCallback(
		(v: string) => {
			if (desktopUpdateDialogDismissedVersions[v]) {
				return
			}

			setVersion(v)
			setOpen(true)
		},
		[desktopUpdateDialogDismissedVersions]
	)

	const preventDefault = useCallback((e: Event) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	useEffect(() => {
		setUpdateDialogOpen(open)
	}, [open, setUpdateDialogOpen])

	useEffect(() => {
		let listener: ReturnType<typeof window.desktopAPI.onMainToWindowMessage> | null = null

		if (IS_DESKTOP) {
			listener = window.desktopAPI.onMainToWindowMessage(message => {
				if (message.type === "updater" && message.data.type === "updateDownloaded") {
					onUpdateDownloaded(message.data.info.version)
				}
			})
		}

		return () => {
			listener?.remove()
		}
	}, [onUpdateDownloaded])

	return (
		<AlertDialog open={open && !maintenanceDialogOpen && !isOnlineDialogOpen && !lockDialogOpen}>
			<AlertDialogContent
				onEscapeKeyDown={isUpdating ? preventDefault : dismiss}
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
				onOpenAutoFocus={preventDefault}
			>
				{!isUpdating && (
					<AlertDialogHeader>
						<AlertDialogTitle>{t("dialogs.desktopUpdate.title")}</AlertDialogTitle>
					</AlertDialogHeader>
				)}
				{isUpdating ? (
					<div className="flex flex-col items-center gap-4">
						<Loader
							size={32}
							className="animate-spin-medium"
						/>
						<p className="text-muted-foreground">{t("dialogs.desktopUpdate.installing")}</p>
					</div>
				) : (
					<p className="text-muted-foreground">{t("dialogs.desktopUpdate.info", { version })}</p>
				)}
				{!isUpdating && (
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={dismiss}
							disabled={isUpdating}
						>
							{t("dialogs.desktopUpdate.dismiss")}
						</AlertDialogCancel>
						<Button
							onClick={update}
							variant="default"
							disabled={isUpdating}
						>
							{t("dialogs.desktopUpdate.update")}
						</Button>
					</AlertDialogFooter>
				)}
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default DesktopUpdateDialog
