import { memo, useState, useEffect, useRef, useCallback } from "react"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"
import eventEmitter from "@/lib/eventEmitter"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"

export type TwoFactorDialogProps = {
	title?: string
	continueButtonText: string
	continueButtonVariant?: "destructive" | "default" | "link" | "outline" | "secondary" | "ghost" | null
	description?: string
}

export type ShowTwoFactorCodeDialogResponse =
	| {
			cancelled: true
	  }
	| {
			cancelled: false
			code: string
	  }

export async function showTwoFactorCodeDialog({
	title,
	continueButtonText,
	description,
	continueButtonVariant
}: TwoFactorDialogProps): Promise<ShowTwoFactorCodeDialogResponse> {
	return await new Promise<ShowTwoFactorCodeDialogResponse>(resolve => {
		const id = Math.random().toString(16).slice(2)

		const listener = eventEmitter.on(
			"twoFactorCodeDialogResponse",
			({ code, requestId, cancelled }: { code: string; requestId: string; cancelled: boolean }) => {
				if (id !== requestId) {
					return
				}

				listener.remove()

				if (cancelled) {
					resolve({ cancelled: true })

					return
				}

				resolve({ cancelled: false, code })
			}
		)

		eventEmitter.emit("openTwoFactorCodeDialog", { requestId: id, title, continueButtonText, continueButtonVariant, description })
	})
}

export const TwoFactorCodeDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [props, setProps] = useState<TwoFactorDialogProps>({
		title: "",
		continueButtonText: "",
		description: "",
		continueButtonVariant: "default"
	})
	const requestId = useRef<string>("")
	const didSubmit = useRef<boolean>(false)
	const [twoFactorCode, setTwoFactorCode] = useState<string>("")

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("twoFactorCodeDialogResponse", {
			code: "",
			cancelled: false,
			requestId: requestId.current
		})

		setOpen(false)
	}, [])

	const submit = useCallback(() => {
		if (twoFactorCode.length !== 6) {
			cancel()

			return
		}

		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("twoFactorCodeDialogResponse", {
			code: twoFactorCode,
			cancelled: false,
			requestId: requestId.current
		})

		setOpen(false)
	}, [twoFactorCode, cancel])

	useEffect(() => {
		const listener = eventEmitter.on("openTwoFactorCodeDialog", (p: TwoFactorDialogProps & { requestId: string }) => {
			requestId.current = p.requestId
			didSubmit.current = false

			setTwoFactorCode("")
			setProps(p)
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<AlertDialog open={open}>
			<AlertDialogContent
				onEscapeKeyDown={cancel}
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
			>
				<AlertDialogHeader>
					{props.title && <AlertDialogTitle>{props.title}</AlertDialogTitle>}
					{props.description && <AlertDialogDescription>{props.description}</AlertDialogDescription>}
					<div className="flex flex-row items-center justify-center p-4">
						<InputOTP
							maxLength={6}
							autoFocus={true}
							onKeyDown={e => {
								if (e.key === "Enter" && twoFactorCode.length === 6) {
									submit()
								}
							}}
							value={twoFactorCode}
							onChange={setTwoFactorCode}
							render={({ slots }) => (
								<>
									<InputOTPGroup>
										{slots.slice(0, 3).map((slot, index) => (
											<InputOTPSlot
												key={index}
												{...slot}
											/>
										))}{" "}
									</InputOTPGroup>
									<InputOTPSeparator />
									<InputOTPGroup>
										{slots.slice(3).map((slot, index) => (
											<InputOTPSlot
												key={index}
												{...slot}
											/>
										))}
									</InputOTPGroup>
								</>
							)}
						/>
					</div>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={cancel}>{t("dialogs.cancel")}</AlertDialogCancel>
					<Button
						onClick={submit}
						variant={props.continueButtonVariant}
					>
						{props.continueButtonText}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default TwoFactorCodeDialog
