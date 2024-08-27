import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { useLocalStorage } from "@uidotdev/usehooks"
import eventEmitter from "@/lib/eventEmitter"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import useErrorToast from "@/hooks/useErrorToast"
import { useTranslation } from "react-i18next"

export const LockPinDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [, setLockPin] = useLocalStorage<string>("lockPin", "")
	const [pinState, setPinState] = useState<{
		pin: string
		confirmPin: string
	}>({
		pin: "",
		confirmPin: ""
	})
	const errorToast = useErrorToast()
	const { t } = useTranslation()

	const save = useCallback(() => {
		if (pinState.pin.length >= 4 && pinState.confirmPin.length >= 4) {
			if (pinState.pin === pinState.confirmPin) {
				setLockPin(pinState.pin)
				setOpen(false)
			} else {
				errorToast(t("settings.security.dialogs.lockPin.notMatching"))
			}

			setPinState({
				pin: "",
				confirmPin: ""
			})
		}
	}, [pinState.pin, pinState.confirmPin, setLockPin, errorToast, t])

	const onKeyUp = useCallback(() => {
		if (pinState.pin.length >= 4 && pinState.confirmPin.length >= 4) {
			if (pinState.pin === pinState.confirmPin) {
				save()
			} else {
				errorToast(t("settings.security.dialogs.lockPin.notMatching"))

				setPinState({
					pin: "",
					confirmPin: ""
				})
			}
		}
	}, [save, pinState.pin, pinState.confirmPin, errorToast, t])

	const onChange = useCallback((value: string) => {
		setPinState(prev => ({
			...prev,
			pin: prev.pin.length !== 4 ? value : prev.pin,
			confirmPin: prev.pin.length === 4 ? value : prev.confirmPin
		}))
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openLockPinDialog", () => {
			setPinState({
				pin: "",
				confirmPin: ""
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
				<DialogHeader>
					{pinState.pin.length !== 4
						? t("settings.security.dialogs.lockPin.enterPin")
						: t("settings.security.dialogs.lockPin.confirmPin")}
				</DialogHeader>
				<div className="flex flex-col items-center p-10">
					<InputOTP
						maxLength={4}
						autoFocus={true}
						onKeyUp={onKeyUp}
						value={pinState.pin.length !== 4 ? pinState.pin : pinState.confirmPin}
						onChange={onChange}
						render={({ slots }) => (
							<>
								<InputOTPGroup>
									{slots.map((slot, index) => (
										<InputOTPSlot
											key={index}
											{...slot}
										/>
									))}{" "}
								</InputOTPGroup>
							</>
						)}
					/>
				</div>
			</DialogContent>
		</Dialog>
	)
})

export default LockPinDialog
