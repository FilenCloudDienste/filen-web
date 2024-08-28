import { useEffect, useRef, useCallback, memo } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import useAccount from "@/hooks/useAccount"
import { showConfirmDialog } from "./dialogs/confirm"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import useIsAuthed from "@/hooks/useIsAuthed"

export const ExportReminder = memo(() => {
	const account = useAccount()
	const didRemindRef = useRef<boolean>(false)
	const [exportReminderFired, setExportReminderFired] = useLocalStorage<boolean>("exportReminderFired", false)
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [authed] = useIsAuthed()

	const remind = useCallback(async () => {
		if (!account || account.account.didExportMasterKeys || didRemindRef.current || exportReminderFired || !authed) {
			return
		}

		didRemindRef.current = true

		setExportReminderFired(true)

		if (
			!(await showConfirmDialog({
				title: t("dialogs.exportReminder.title"),
				continueButtonText: t("dialogs.exportReminder.continue"),
				description: t("dialogs.exportReminder.description"),
				continueButtonVariant: "default",
				cancelButtonText: t("dialogs.exportReminder.dismiss")
			}))
		) {
			return
		}

		navigate({
			to: "/settings/$type",
			params: {
				type: "security"
			}
		})
	}, [account, t, navigate, exportReminderFired, setExportReminderFired, authed])

	useEffect(() => {
		if (!account || account.account.didExportMasterKeys || didRemindRef.current || exportReminderFired || !authed) {
			return
		}

		remind()
	}, [account, remind, exportReminderFired, authed])

	return null
})

export default ExportReminder
