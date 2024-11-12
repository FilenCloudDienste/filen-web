import { useEffect, useCallback, memo, useRef, useMemo } from "react"
import useAccount from "@/hooks/useAccount"
import { showConfirmDialog } from "./dialogs/confirm"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import useLocation from "@/hooks/useLocation"

export const ExportReminder = memo(() => {
	const account = useAccount()
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [authed] = useIsAuthed()
	const didShowReminder = useRef<boolean>(false)
	const location = useLocation()
	const remindTimeout = useRef<ReturnType<typeof setTimeout>>()

	const canShow = useMemo(() => {
		if (!account || account.account.didExportMasterKeys || didShowReminder.current || !authed) {
			return false
		}

		return (
			(location.includes("/drive") || location.includes("/notes") || location.includes("/chats") || location.includes("/contacts")) &&
			!location.includes("/settings")
		)
	}, [account, authed, location])

	const remind = useCallback(async () => {
		if (!canShow) {
			return
		}

		didShowReminder.current = true

		try {
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
		} catch (e) {
			console.error(e)
		}
	}, [t, canShow, navigate])

	useEffect(() => {
		if (!canShow) {
			return
		}

		clearTimeout(remindTimeout.current)

		remindTimeout.current = setTimeout(() => {
			remind()
		}, 1000)

		return () => {
			clearTimeout(remindTimeout.current)
		}
	}, [canShow, remind])

	return null
})

export default ExportReminder
