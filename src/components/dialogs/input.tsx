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

export type InputDialogProps = {
	title: string
	continueButtonText: string
	continueButtonVariant?: "destructive" | "default" | "link" | "outline" | "secondary" | "ghost" | null
	description?: string
	value: string
	autoFocusInput: boolean
	placeholder: string
	allowEmptyValue?: boolean
	minLength?: number
	maxLength?: number
}

export type ShowInputDialogResponse =
	| {
			cancelled: true
	  }
	| {
			cancelled: false
			value: string
	  }

export async function showInputDialog({
	title,
	continueButtonText,
	description,
	continueButtonVariant,
	value,
	autoFocusInput,
	placeholder,
	allowEmptyValue = false,
	minLength,
	maxLength
}: InputDialogProps): Promise<ShowInputDialogResponse> {
	return await new Promise<ShowInputDialogResponse>(resolve => {
		const id = Math.random().toString(16).slice(2)

		const listener = eventEmitter.on(
			"inputDialogResponse",
			({ cancelled, requestId, value }: { cancelled: boolean; requestId: string; value: string }) => {
				if (id !== requestId) {
					return
				}

				listener.remove()

				if (cancelled) {
					resolve({ cancelled })
				}

				resolve({ cancelled: false, value })
			}
		)

		eventEmitter.emit("openInputDialog", {
			requestId: id,
			title,
			continueButtonText,
			continueButtonVariant,
			description,
			value,
			autoFocusInput,
			placeholder,
			allowEmptyValue,
			minLength,
			maxLength
		})
	})
}

export const InputDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [props, setProps] = useState<InputDialogProps>({
		title: "",
		continueButtonText: "",
		description: "",
		continueButtonVariant: "default",
		value: "",
		autoFocusInput: true,
		placeholder: "",
		allowEmptyValue: false,
		minLength: undefined,
		maxLength: undefined
	})
	const requestId = useRef<string>("")
	const didSubmit = useRef<boolean>(false)
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<HTMLInputElement>(null)

	const submit = useCallback(() => {
		if (didSubmit.current || (value.length === 0 && !props.allowEmptyValue)) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("inputDialogResponse", {
			cancelled: false,
			value,
			requestId: requestId.current
		})

		setOpen(false)
		setValue("")
	}, [value, props.allowEmptyValue])

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("inputDialogResponse", {
			cancelled: true,
			value: "",
			requestId: requestId.current
		})

		setOpen(false)
		setValue("")
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openInputDialog", (p: InputDialogProps & { requestId: string }) => {
			requestId.current = p.requestId
			didSubmit.current = false

			setValue(p.value)
			setProps(p)
			setOpen(true)

			if (p.autoFocusInput) {
				setTimeout(() => {
					if (p.value) {
						if (p.value === ".txt") {
							inputRef.current?.setSelectionRange(0, 0)
						} else if (p.value.includes(".")) {
							const lastDotIndex = p.value.lastIndexOf(".")
							const end = lastDotIndex === -1 ? p.value.length : lastDotIndex

							inputRef.current?.setSelectionRange(0, end)
						} else {
							inputRef.current?.setSelectionRange(0, p.value.length)
						}
					}

					inputRef.current?.focus()
				}, 100)
			}
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
					{props.description && <AlertDialogDescription>{props.description}</AlertDialogDescription>}
				</AlertDialogHeader>
				<Input
					ref={inputRef}
					value={value}
					onChange={e => setValue(e.target.value)}
					autoFocus={props.autoFocusInput}
					placeholder={props.placeholder}
					onKeyDown={e => {
						if (e.key === "Enter") {
							submit()
						}
					}}
					autoCapitalize="none"
					autoComplete="none"
					autoCorrect="none"
					minLength={props.minLength}
					maxLength={props.maxLength}
				/>
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

export default InputDialog
