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
import { Input } from "@/components/ui/input"
import useSuccessToast from "@/hooks/useSuccessToast"
import useErrorToast from "@/hooks/useErrorToast"
import { Copy } from "lucide-react"

export type ConfirmDialogProps = {
	title: string
	continueButtonText: string
	continueButtonVariant?: "destructive" | "default" | "link" | "outline" | "secondary" | "ghost" | null
	description: string
	withInputField?: string
}

export async function showConfirmDialog({
	title,
	continueButtonText,
	description,
	continueButtonVariant,
	withInputField
}: ConfirmDialogProps): Promise<boolean> {
	return await new Promise<boolean>(resolve => {
		const id = Math.random().toString(16).slice(2)

		const listener = eventEmitter.on("confirmDialogResponse", ({ confirmed, requestId }: { confirmed: boolean; requestId: string }) => {
			if (id !== requestId) {
				return
			}

			listener.remove()

			resolve(confirmed)
		})

		eventEmitter.emit("openConfirmDialog", {
			requestId: id,
			title,
			continueButtonText,
			continueButtonVariant,
			description,
			withInputField
		})
	})
}

export const ConfirmDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [props, setProps] = useState<ConfirmDialogProps>({
		title: "",
		continueButtonText: "",
		description: "",
		continueButtonVariant: "default",
		withInputField: undefined
	})
	const requestId = useRef<string>("")
	const didSubmit = useRef<boolean>(false)
	const successToast = useSuccessToast()
	const errorToast = useErrorToast()

	const submit = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("confirmDialogResponse", {
			confirmed: true,
			requestId: requestId.current
		})

		setOpen(false)
	}, [])

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("confirmDialogResponse", {
			confirmed: false,
			requestId: requestId.current
		})

		setOpen(false)
	}, [])

	const copyInputField = useCallback(async () => {
		if (!props.withInputField) {
			return
		}

		try {
			await navigator.clipboard.writeText(props.withInputField)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [props.withInputField, successToast, errorToast, t])

	useEffect(() => {
		const keyDownListener = (e: KeyboardEvent) => {
			if (e.key === "Enter" && open) {
				submit()
			}
		}

		window.addEventListener("keydown", keyDownListener)

		return () => {
			window.removeEventListener("keydown", keyDownListener)
		}
	}, [open, submit])

	useEffect(() => {
		const listener = eventEmitter.on("openConfirmDialog", (p: ConfirmDialogProps & { requestId: string }) => {
			requestId.current = p.requestId
			didSubmit.current = false

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
					<AlertDialogTitle>{props.title}</AlertDialogTitle>
					<AlertDialogDescription>{props.description}</AlertDialogDescription>
					{props.withInputField && (
						<div className="flex flex-row items-center gap-1 py-4 justify-center">
							<Input
								value={props.withInputField}
								onChange={e => e.preventDefault()}
								type="text"
								className="w-full"
								autoCapitalize="none"
								autoComplete="none"
								autoCorrect="none"
							/>
							<Button onClick={copyInputField}>
								<Copy size={18} />
							</Button>
						</div>
					)}
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

export default ConfirmDialog
