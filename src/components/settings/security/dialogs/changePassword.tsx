import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import Input from "@/components/input"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useSuccessToast from "@/hooks/useSuccessToast"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/setup"

export const ChangePasswordDialog = memo(() => {
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
	const successToast = useSuccessToast()

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

		window.disableInvalidAPIKeyLogout = true

		try {
			await worker.changePassword({
				newPassword: inputs.new,
				currentPassword: inputs.password
			})

			successToast(t("dialogs.changePassword.successToast"))

			await new Promise(resolve => setTimeout(resolve, 1000))

			await logout()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			window.disableInvalidAPIKeyLogout = false

			toast.dismiss()
		}
	}, [loadingToast, errorToast, inputs, successToast, t])

	useEffect(() => {
		const listener = eventEmitter.on("openChangePasswordDialog", () => {
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
				<DialogHeader>{t("dialogs.changePassword.title")}</DialogHeader>
				<div className="flex flex-col gap-3 mb-3">
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.changePassword.newPassword")}</p>
						<Input
							type={showPassword ? "text" : "password"}
							value={inputs.new}
							onChange={onNewChange}
							placeholder={t("dialogs.changePassword.newPasswordPlaceholder")}
							className={cn(inputs.notIdentical ? "border-red-500" : undefined)}
							withPasswordToggleIcon={true}
							onPasswordToggle={toggleShowPassword}
							required={true}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.changePassword.confirmNewPassword")}</p>
						<Input
							type={showPassword ? "text" : "password"}
							value={inputs.confirm}
							onChange={onConfirmChange}
							placeholder={t("dialogs.changePassword.confirmNewPasswordPlaceholder")}
							className={cn(inputs.notIdentical ? "border-red-500" : undefined)}
							withPasswordToggleIcon={true}
							onPasswordToggle={toggleShowPassword}
							required={true}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t("dialogs.changePassword.currentPassword")}</p>
						<Input
							type={showPassword ? "text" : "password"}
							value={inputs.password}
							onChange={onPasswordChange}
							placeholder={t("dialogs.changePassword.currentPasswordPlaceholder")}
							className={cn(inputs.notIdentical ? "border-red-500" : undefined)}
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
						{t("dialogs.changePassword.close")}
					</Button>
					<Button
						onClick={save}
						variant="default"
					>
						{t("dialogs.changePassword.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

export default ChangePasswordDialog
