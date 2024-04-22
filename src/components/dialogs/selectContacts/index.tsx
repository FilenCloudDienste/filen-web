import { memo, useState, useEffect, useRef, useCallback } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useTranslation } from "react-i18next"
import eventEmitter from "@/lib/eventEmitter"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import List from "./list"

export type SelectContactsResponse = { cancelled: true } | { cancelled: false; contacts: Contact[] }

export async function selectContacts(): Promise<SelectContactsResponse> {
	return await new Promise<SelectContactsResponse>(resolve => {
		const id = Math.random().toString(16).slice(2)

		const listener = eventEmitter.on("selectContactsResponse", ({ contacts, id: i }: { contacts: Contact[]; id: string }) => {
			if (id !== i) {
				return
			}

			listener.remove()

			if (contacts.length === 0) {
				resolve({ cancelled: true })

				return
			}

			resolve({ cancelled: false, contacts })
		})

		eventEmitter.emit("openSelectContactsDialog", { id })
	})
}

export const SelectContactsDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const requestId = useRef<string>("")
	const [responseContacts, setResponseContacts] = useState<Contact[]>([])
	const didSubmit = useRef<boolean>(false)

	const submit = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("selectContactsResponse", {
			contacts: responseContacts,
			id: requestId.current
		})

		setOpen(false)
	}, [responseContacts])

	const cancel = useCallback(() => {
		if (didSubmit.current) {
			return
		}

		didSubmit.current = true

		eventEmitter.emit("selectContactsResponse", {
			contacts: [],
			id: requestId.current
		})

		setOpen(false)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openSelectContactsDialog", ({ id }: { id: string }) => {
			requestId.current = id
			didSubmit.current = false

			setResponseContacts([])
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<AlertDialog
			open={open}
			onOpenChange={openState => {
				setOpen(openState)
				cancel()
			}}
		>
			<AlertDialogContent
				onEscapeKeyDown={cancel}
				className="outline-none focus:outline-none active:outline-none hover:outline-none"
			>
				<AlertDialogHeader>
					<AlertDialogTitle className="mb-1">{t("dialogs.selectContacts.title")}</AlertDialogTitle>
					<List
						responseContacts={responseContacts}
						setResponseContacts={setResponseContacts}
					/>
				</AlertDialogHeader>
				<AlertDialogFooter className="items-center">
					<AlertDialogCancel onClick={cancel}>{t("dialogs.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={submit}
						disabled={responseContacts.length === 0}
					>
						{t("dialogs.selectContacts.submit")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default SelectContactsDialog
