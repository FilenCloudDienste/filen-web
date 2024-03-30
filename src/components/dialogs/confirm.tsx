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

export type ConfirmDialogProps = {
	title: string
	continueButtonText: string
	continueButtonVariant?: "destructive" | "default" | "link" | "outline" | "secondary" | "ghost" | null
	description: string
}

export async function showConfirmDialog({
	title,
	continueButtonText,
	description,
	continueButtonVariant
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

		eventEmitter.emit("openConfirmDialog", { requestId: id, title, continueButtonText, continueButtonVariant, description })
	})
}

export const ConfirmDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [props, setProps] = useState<ConfirmDialogProps>({
		title: "",
		continueButtonText: "",
		description: "",
		continueButtonVariant: "default"
	})
	const requestId = useRef<string>("")
	const didSubmit = useRef<boolean>(false)

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
				onOpenAutoFocus={e => e.preventDefault()}
				onEscapeKeyDown={cancel}
				onCloseAutoFocus={e => e.preventDefault()}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{props.title}</AlertDialogTitle>
					<AlertDialogDescription>{props.description}</AlertDialogDescription>
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
