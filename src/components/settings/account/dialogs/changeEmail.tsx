import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import Input from "@/components/input"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"

export const ChangeEmailDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [inputs, setInputs] = useState<{
		new: string
		confirm: string
		password: string
		notIdentical: boolean
	}>({
		new: "",
		confirm: "",
		password: "",
		notIdentical: false
	})
	const [showPassword, setShowPassword] = useState<boolean>(false)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const onNewChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			new: e.target.value
		}))
	}, [])

	const onConfirmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			confirm: e.target.value
		}))
	}, [])

	const onPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			password: e.target.value
		}))
	}, [])

	const toggleShowPassword = useCallback(() => {
		setShowPassword(prev => !prev)
	}, [])

	const save = useCallback(async () => {
		if (inputs.new.trim() !== inputs.confirm.trim() || inputs.new.length === 0 || inputs.new.length === 0) {
			setInputs(prev => ({
				...prev,
				notIdentical: true
			}))

			return
		}

		const toast = loadingToast()

		try {
			await worker.changeEmail({
				email: inputs.new.trim(),
				password: inputs.password
			})

			await showConfirmDialog({
				title: t("dialogs.changeEmail.alerts.success.title"),
				continueButtonText: t("dialogs.changeEmail.alerts.success.continue"),
				cancelButtonText: t("dialogs.changeEmail.alerts.success.dismiss"),
				description: t("dialogs.changeEmail.alerts.success.description", {
					email: inputs.new.trim()
				}),
				continueButtonVariant: "default"
			})

			setTimeout(() => setOpen(false), 100)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, inputs, t])

	useEffect(() => {
		const listener = eventEmitter.on("openChangeEmailDialog", () => {
			setInputs({
				new: "",
				confirm: "",
				password: "",
				notIdentical: false
			})
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
				<DialogHeader>{t("dialogs.changeEmail.title")}</DialogHeader>
				<div className="flex flex-col gap-3 mb-3">
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.changeEmail.newEmail")}</p>
						<Input
							type="email"
							value={inputs.new}
							onChange={onNewChange}
							placeholder={t("dialogs.changeEmail.newEmailPlaceholder")}
							className={inputs.notIdentical ? "border-red-500" : undefined}
							required={true}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.changeEmail.confirmNewEmail")}</p>
						<Input
							type="email"
							value={inputs.confirm}
							onChange={onConfirmChange}
							placeholder={t("dialogs.changeEmail.confirmNewEmailPlaceholder")}
							className={inputs.notIdentical ? "border-red-500" : undefined}
							required={true}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.changeEmail.password")}</p>
						<Input
							type={showPassword ? "text" : "password"}
							value={inputs.password}
							onChange={onPasswordChange}
							placeholder={t("dialogs.changeEmail.passwordPlaceholder")}
							withPasswordToggleIcon={true}
							onPasswordToggle={toggleShowPassword}
							required={true}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={close}
						variant="outline"
					>
						{t("dialogs.changeEmail.close")}
					</Button>
					<Button
						onClick={save}
						variant="default"
					>
						{t("dialogs.changeEmail.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

export default ChangeEmailDialog
