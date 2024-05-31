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
import { Input } from "@/components/ui/input"
import QRCode from "react-qr-code"
import { Copy } from "lucide-react"
import useSuccessToast from "@/hooks/useSuccessToast"
import useErrorToast from "@/hooks/useErrorToast"

export type TwoFactorDialogProps = {
	title?: string
	continueButtonText: string
	continueButtonVariant?: "destructive" | "default" | "link" | "outline" | "secondary" | "ghost" | null
	description?: string
	keyToDisplay?: string
	keyToDisplayRaw?: string
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
	continueButtonVariant,
	keyToDisplay,
	keyToDisplayRaw
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

		eventEmitter.emit("openTwoFactorCodeDialog", {
			requestId: id,
			title,
			continueButtonText,
			continueButtonVariant,
			description,
			keyToDisplay,
			keyToDisplayRaw
		})
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
	const [useRecoveryKey, setUseRecoveryKey] = useState<boolean>(false)
	const errorToast = useErrorToast()
	const successToast = useSuccessToast()

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("twoFactorCodeDialogResponse", {
			code: "",
			cancelled: true,
			requestId: requestId.current
		})

		setOpen(false)
	}, [])

	const submit = useCallback(() => {
		if (twoFactorCode.length < 6) {
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

	const otpOnKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && twoFactorCode.length === 6) {
				submit()
			}
		},
		[submit, twoFactorCode.length]
	)

	const recoveryInputOnChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setTwoFactorCode(e.target.value)
	}, [])

	const copyKeyToDisplay = useCallback(async () => {
		if (!props.keyToDisplayRaw) {
			return
		}

		try {
			await navigator.clipboard.writeText(props.keyToDisplayRaw)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [props.keyToDisplayRaw, successToast, errorToast, t])

	useEffect(() => {
		const listener = eventEmitter.on("openTwoFactorCodeDialog", (p: TwoFactorDialogProps & { requestId: string }) => {
			requestId.current = p.requestId
			didSubmit.current = false

			setUseRecoveryKey(false)
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
					{props.keyToDisplay && props.keyToDisplayRaw && (
						<div className="flex flex-col gap-2">
							<div className="flex flex-row justify-center">
								<div className="flex flex-row bg-white rounded-md p-4 my-4">
									<QRCode
										value={props.keyToDisplay}
										size={175}
									/>
								</div>
							</div>
							<div className="flex flex-row items-center gap-1 mb-2 justify-center">
								<Input
									value={props.keyToDisplayRaw}
									onChange={e => e.preventDefault()}
									type="text"
									className="w-[175px]"
								/>
								<Button onClick={copyKeyToDisplay}>
									<Copy size={18} />
								</Button>
							</div>
						</div>
					)}
					<div className="flex flex-row items-center justify-center p-4 py-8">
						{useRecoveryKey ? (
							<Input
								value={twoFactorCode}
								onChange={recoveryInputOnChange}
								placeholder={t("dialogs.twoFactorCode.recoveryKeyPlaceholder")}
								type="text"
								autoFocus={true}
							/>
						) : (
							<InputOTP
								maxLength={6}
								autoFocus={true}
								onKeyDown={otpOnKeyDown}
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
						)}
					</div>
					{!props.keyToDisplay && (
						<div className="flex flex-row justify-center pb-4">
							<p
								className="text-sm text-muted-foreground underline cursor-pointer"
								onClick={() => setUseRecoveryKey(true)}
							>
								{t("dialogs.twoFactorCode.useRecoveryKey")}
							</p>
						</div>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={cancel}>{t("dialogs.cancel")}</AlertDialogCancel>
					<Button
						onClick={submit}
						variant={props.continueButtonVariant}
						disabled={twoFactorCode.length < 6}
					>
						{props.continueButtonText}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default TwoFactorCodeDialog
