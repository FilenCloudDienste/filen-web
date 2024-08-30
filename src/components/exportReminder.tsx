import { useEffect, useCallback, memo } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import useAccount from "@/hooks/useAccount"
import { showConfirmDialog } from "./dialogs/confirm"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Semaphore } from "@/lib/semaphore"

const mutex = new Semaphore(1)

export const ExportReminder = memo(() => {
	const account = useAccount()
	const [exportReminderFired, setExportReminderFired] = useLocalStorage<boolean>("exportReminderFired", false)
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [authed] = useIsAuthed()

	const remind = useCallback(async () => {
		await mutex.acquire()

		try {
			if (!account || account.account.didExportMasterKeys || exportReminderFired || !authed) {
				return
			}

			if (
				!(await showConfirmDialog({
					title: t("dialogs.exportReminder.title"),
					continueButtonText: t("dialogs.exportReminder.continue"),
					description: t("dialogs.exportReminder.description"),
					continueButtonVariant: "default",
					cancelButtonText: t("dialogs.exportReminder.dismiss")
				}))
			) {
				setExportReminderFired(true)

				return
			}

			setExportReminderFired(true)

			navigate({
				to: "/settings/$type",
				params: {
					type: "security"
				}
			})
		} catch (e) {
			console.error(e)
		} finally {
			mutex.release()
		}
	}, [account, t, navigate, exportReminderFired, setExportReminderFired, authed])

	useEffect(() => {
		if (!account || account.account.didExportMasterKeys || exportReminderFired || !authed) {
			return
		}

		remind()
	}, [account, remind, exportReminderFired, authed])

	return null
})

export default ExportReminder
