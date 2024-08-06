import { memo, useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useSuccessToast from "@/hooks/useSuccessToast"
import { usePublicLinkStore } from "@/stores/publicLink.store"
import { simpleDate } from "@/utils"
import axios from "axios"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export const REPORT_API_URL = "https://filen.io/api/v1/ticket/submit"

export type ReportReason = "spam" | "dmca" | "cp" | "stolen" | "malware" | "other"

export const ReportDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [inputs, setInputs] = useState<{
		reason: ReportReason | ""
		email: string
		comment: string
	}>({
		reason: "",
		email: "",
		comment: ""
	})
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const successToast = useSuccessToast()
	const { passwordState } = usePublicLinkStore()
	const publicLinkURLState = usePublicLinkURLState()
	const [sending, setSending] = useState<boolean>(false)

	const canSend = useMemo(() => {
		return inputs.email.trim().length > 0 && inputs.reason.length > 0 && inputs.email.includes("@")
	}, [inputs.email, inputs.reason])

	const reasonToString = useMemo(() => {
		switch (inputs.reason) {
			case "cp": {
				return t("dialogs.report.reasons.cp")
			}

			case "dmca": {
				return t("dialogs.report.reasons.dmca")
			}

			case "spam": {
				return t("dialogs.report.reasons.spam")
			}

			case "stolen": {
				return t("dialogs.report.reasons.stolen")
			}

			case "malware": {
				return t("dialogs.report.reasons.malware")
			}

			case "other": {
				return t("dialogs.report.reasons.other")
			}

			default: {
				return t("dialogs.report.reasons.dmca")
			}
		}
	}, [inputs.reason, t])

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const onEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			email: e.target.value
		}))
	}, [])

	const onReasonChange = useCallback((reason: ReportReason) => {
		setInputs(prev => ({
			...prev,
			reason
		}))
	}, [])

	const send = useCallback(async () => {
		if (inputs.email.trim().length === 0 || inputs.reason.length === 0 || !inputs.email.includes("@")) {
			return
		}

		setSending(true)

		const toast = loadingToast()

		try {
			const text =
				"Abuse report\n\nDate: " +
				simpleDate(Date.now()) +
				"\nLink: " +
				window.location.href +
				"\nPassword: " +
				(passwordState.password.length > 0 ? passwordState.password : "N/A") +
				"\nReason: " +
				inputs.reason +
				"" +
				(inputs.comment.length > 0 ? "\n\nComment:\n\n" + inputs.comment : "")

			const res = await axios.post(REPORT_API_URL, {
				email: inputs.email,
				confirmEmail: inputs.email,
				subject: "Abuse report",
				text
			})

			if (!res.data.status) {
				throw new Error(res.data.message)
			}

			setTimeout(() => setOpen(false), 100)

			successToast(t("dialogs.report.successToast"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()

			setSending(false)
		}
	}, [loadingToast, errorToast, inputs, successToast, t, passwordState.password])

	const openDialog = useCallback(() => {
		if (passwordState.password.length > 0 && publicLinkURLState.uuid !== passwordState.uuid) {
			return
		}

		setInputs({
			reason: "dmca",
			email: "",
			comment: ""
		})

		setOpen(true)
	}, [publicLinkURLState.uuid, passwordState.uuid, passwordState.password])

	useEffect(() => {
		const listener = eventEmitter.on("openReportDialog", openDialog)

		return () => {
			listener.remove()
		}
	}, [openDialog])

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogContent className="outline-none focus:outline-none active:outline-none hover:outline-none">
				<DialogHeader>{t("dialogs.report.title")}</DialogHeader>
				<div className="flex flex-col gap-3 mb-3">
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.report.email")}</p>
						<Input
							type="email"
							value={inputs.email}
							onChange={onEmailChange}
							placeholder={t("dialogs.report.emailPlaceholder")}
							required={true}
							autoCapitalize="none"
							autoComplete="none"
							autoCorrect="none"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.report.reason")}</p>
						<Select onValueChange={onReasonChange}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={reasonToString} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="dmca">{t("dialogs.report.reasons.dmca")}</SelectItem>
								<SelectItem value="stolen">{t("dialogs.report.reasons.stolen")}</SelectItem>
								<SelectItem value="malware">{t("dialogs.report.reasons.malware")}</SelectItem>
								<SelectItem value="cp">{t("dialogs.report.reasons.cp")}</SelectItem>
								<SelectItem value="spam">{t("dialogs.report.reasons.spam")}</SelectItem>
								<SelectItem value="other">{t("dialogs.report.reasons.other")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.report.comment")}</p>
						<Textarea
							className="w-full h-40 resize-none"
							placeholder={t("dialogs.report.commentPlaceholder")}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={close}
						variant="outline"
					>
						{t("dialogs.report.close")}
					</Button>
					<Button
						onClick={send}
						variant="default"
						disabled={!canSend || sending}
					>
						{t("dialogs.report.send")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

export default ReportDialog
