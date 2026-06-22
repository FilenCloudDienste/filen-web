import { memo, useState, useEffect, useMemo, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"
import { type UserAccountSubs } from "@filen/sdk/dist/types/api/v3/user/account"
import { simpleDate } from "@/utils"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import useSuccessToast from "@/hooks/useSuccessToast"
import { withdrawSubscription } from "@/lib/api/withdrawal"

// The account endpoint now returns "withdrawRequested" per subscription, but the bundled SDK type
// is outdated. The field is optional here because a persisted (pre-deployment) account response may
// not contain it until the next refetch.
export type SubscriptionWithWithdrawal = UserAccountSubs & { withdrawRequested?: number }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const WithdrawalDialog = memo(
	({
		sub,
		namePrefill,
		emailPrefill,
		onClose,
		onConfirmed
	}: {
		sub: SubscriptionWithWithdrawal | null
		namePrefill: string
		emailPrefill: string
		onClose: () => void
		onConfirmed: (uuid: string) => void
	}) => {
		const { t, i18n } = useTranslation()
		const errorToast = useErrorToast()
		const loadingToast = useLoadingToast()
		const successToast = useSuccessToast()
		const [name, setName] = useState<string>("")
		const [email, setEmail] = useState<string>("")
		const [submitting, setSubmitting] = useState<boolean>(false)

		useEffect(() => {
			if (sub) {
				setName(namePrefill)
				setEmail(emailPrefill)
				setSubmitting(false)
			}
		}, [sub, namePrefill, emailPrefill])

		// Unique, human readable contract identifier (§ 356a Abs. 2 Nr. 2), so stacked identical plans stay distinguishable.
		const contractLabel = useMemo(() => {
			if (!sub) {
				return ""
			}

			return sub.planName + " · " + sub.planCost + "€ · " + simpleDate(sub.startTimestamp) + " · #" + sub.id
		}, [sub])

		const submit = useCallback(async () => {
			if (!sub || submitting) {
				return
			}

			if (name.trim().length === 0) {
				errorToast(t("settings.withdrawal.nameRequired"))

				return
			}

			if (!EMAIL_REGEX.test(email.trim())) {
				errorToast(t("settings.withdrawal.invalidEmail"))

				return
			}

			setSubmitting(true)

			const toast = loadingToast()

			try {
				await withdrawSubscription({
					uuid: sub.id,
					name: name.trim(),
					email: email.trim(),
					lang: i18n.language.toLowerCase().startsWith("de") ? "de" : "en"
				})

				onConfirmed(sub.id)

				successToast(t("settings.withdrawal.successToast"))

				onClose()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()

				setSubmitting(false)
			}
		}, [sub, submitting, name, email, i18n.language, loadingToast, errorToast, successToast, onConfirmed, onClose, t])

		return (
			<Dialog
				open={sub !== null}
				onOpenChange={open => {
					if (!open) {
						onClose()
					}
				}}
			>
				<DialogContent className="select-none">
					<DialogHeader>
						<DialogTitle>{t("settings.withdrawal.dialogTitle")}</DialogTitle>
						<DialogDescription>{t("settings.withdrawal.dialogDescription")}</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-6 py-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="withdrawal-name">{t("settings.withdrawal.fieldName")}</Label>
							<Input
								id="withdrawal-name"
								value={name}
								onChange={e => setName(e.target.value)}
								autoComplete="off"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>{t("settings.withdrawal.fieldContract")}</Label>
							<p className="text-sm text-muted-foreground break-all">{contractLabel}</p>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="withdrawal-email">{t("settings.withdrawal.fieldEmail")}</Label>
							<Input
								id="withdrawal-email"
								type="email"
								value={email}
								onChange={e => setEmail(e.target.value)}
								autoComplete="off"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={onClose}
							disabled={submitting}
						>
							{t("settings.withdrawal.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={submit}
							disabled={submitting}
						>
							{t("settings.withdrawal.confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		)
	}
)

export default WithdrawalDialog
