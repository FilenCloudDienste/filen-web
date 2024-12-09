import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useLocalStorage } from "@uidotdev/usehooks"
import { IS_DESKTOP, IS_APPLE_DEVICE, DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import useErrorToast from "@/hooks/useErrorToast"
import { useTranslation } from "react-i18next"
import { LockIcon } from "lucide-react"
import useMountedEffect from "@/hooks/useMountedEffect"
import WindowControls from "../windowControls"
import { useMiscStore } from "@/stores/misc.store"

// This is by no means safe. In the packaged electron version we can disable the console, making it _almost_ impossible for a _normal_ user to access the app when it's locked.
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
	const triesRef = useRef<number>(0)
	const [lockNextTry, setLockNextTry] = useLocalStorage<number>("lockNextTry", 0)
	const setLockDialogOpen = useMiscStore(useCallback(state => state.setLockDialogOpen, []))

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

		const now = Date.now()

		if (lockNextTry > now) {
			errorToast(t("settings.security.dialogs.lock.tooManyAttempts"))

			setPin("")

			return
		}

		if (pin !== lockPin) {
			setPin("")

			triesRef.current += 1

			if (triesRef.current >= 10) {
				setLockNextTry(now + 300000)

				triesRef.current = 0

				errorToast(t("settings.security.dialogs.lock.tooManyAttempts"))
			} else {
				errorToast(t("settings.security.dialogs.lock.wrongPin"))
			}

			return
		}

		triesRef.current = 0

		setLockNextTry(0)
		resetTimer()
		setOpen(false)
	}, [pin, lockPin, resetTimer, errorToast, t, lockTimeout, lockNextTry, setLockNextTry])

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
		setLockDialogOpen(open)
	}, [open, setLockDialogOpen])

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
				{IS_DESKTOP && !IS_APPLE_DEVICE && (
					<div
						className="flex flex-row absolute right-0 top-0 z-50"
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "no-drag",
							height: DESKTOP_TOPBAR_HEIGHT
						}}
					>
						<WindowControls />
					</div>
				)}
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
