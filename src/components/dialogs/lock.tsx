import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useLocalStorage } from "@uidotdev/usehooks"
import { IS_DESKTOP } from "@/constants"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import useErrorToast from "@/hooks/useErrorToast"
import { useTranslation } from "react-i18next"
import { LockIcon } from "lucide-react"
import useMountedEffect from "@/hooks/useMountedEffect"

// This is by no means safe. In the packaged electron version we can disable the console, making it _almost_ impossible for a normal user to access the app when it's locked.
// You could still open the Chromium DB in the user's install directory, but if someone with this kind of knowledge sits (or remotes) at your PC, you have other problems.

export const LockDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	const [lockTimeout] = useLocalStorage<number>("lockTimeout", 0)
	const [lockPin] = useLocalStorage<string>("lockPin", "")
	const [pin, setPin] = useState<string>("")
	const errorToast = useErrorToast()
	const { t } = useTranslation()
	const ref = useRef<HTMLInputElement>(null)

	const onEscapeKeyDown = useCallback((e: KeyboardEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const openDialog = useCallback(() => {
		if (lockPin.length === 0 || lockTimeout === 0) {
			return
		}

		setPin("")
		setOpen(true)
	}, [lockTimeout, lockPin.length])

	const resetTimer = useCallback(() => {
		clearTimeout(timeoutRef.current)

		if (lockPin.length === 0 || lockTimeout === 0) {
			return
		}

		timeoutRef.current = setTimeout(
			() => {
				openDialog()
			},
			Math.floor(lockTimeout * 1000)
		)
	}, [lockTimeout, lockPin.length, openDialog])

	const handleUserActivity = useCallback(() => {
		if (open) {
			return
		}

		setOpen(false)
		resetTimer()
	}, [open, resetTimer])

	const submit = useCallback(() => {
		if (lockPin.length === 0 || lockTimeout === 0) {
			return
		}

		if (pin !== lockPin) {
			errorToast(t("settings.security.dialogs.lock.wrongPin"))

			setPin("")

			return
		}

		resetTimer()
		setOpen(false)
	}, [pin, lockPin, resetTimer, errorToast, t, lockTimeout])

	const onKeyUp = useCallback(() => {
		if (pin.length === 4) {
			submit()
		}
	}, [submit, pin.length])

	const onWindowKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (lockPin.length === 0 || lockTimeout === 0) {
				return
			}

			if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
				openDialog()
			}
		},
		[lockPin.length, lockTimeout, openDialog]
	)

	const focusInput = useCallback(() => {
		ref.current?.focus()
	}, [])

	useEffect(() => {
		resetTimer()

		//window.addEventListener("mousemove", handleUserActivity)
		window.addEventListener("keydown", handleUserActivity)
		window.addEventListener("mousedown", handleUserActivity)
		window.addEventListener("touchstart", handleUserActivity)
		window.addEventListener("keydown", onWindowKeyDown)
		window.addEventListener("focus", handleUserActivity)
		window.addEventListener("mouseenter", handleUserActivity)
		window.addEventListener("mouseleave", handleUserActivity)

		return () => {
			clearTimeout(timeoutRef.current)

			//window.removeEventListener("mousemove", handleUserActivity)
			window.removeEventListener("keydown", handleUserActivity)
			window.removeEventListener("mousedown", handleUserActivity)
			window.removeEventListener("touchstart", handleUserActivity)
			window.removeEventListener("keydown", onWindowKeyDown)
			window.removeEventListener("focus", handleUserActivity)
			window.removeEventListener("mouseenter", handleUserActivity)
			window.removeEventListener("mouseleave", handleUserActivity)
		}
	}, [handleUserActivity, resetTimer, onWindowKeyDown])

	useMountedEffect(() => {
		openDialog()
	})

	if (!IS_DESKTOP) {
		return null
	}

	return (
		<Dialog open={open}>
			<DialogContent
				className="fullscreen-dialog no-close-button outline-none focus:outline-none active:outline-none hover:outline-none bg-background flex flex-row items-center justify-center select-none"
				onEscapeKeyDown={onEscapeKeyDown}
				onClick={focusInput}
				style={{
					// @ts-expect-error not typed
					WebkitAppRegion: "drag"
				}}
			>
				<div
					className="flex flex-col items-center p-10"
					onClick={focusInput}
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "no-drag"
					}}
				>
					<LockIcon
						size={64}
						className="mb-10 text-muted-foreground"
					/>
					<InputOTP
						ref={ref}
						maxLength={4}
						autoFocus={true}
						onKeyUp={onKeyUp}
						value={pin}
						onChange={setPin}
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

export default LockDialog
