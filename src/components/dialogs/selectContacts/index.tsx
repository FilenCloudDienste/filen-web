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
import { Input } from "@/components/ui/input"

export type SelectContactsResponse = { cancelled: true } | { cancelled: false; contacts: Contact[] }

export async function selectContacts(params?: { excludeUserIds?: number[] }): Promise<SelectContactsResponse> {
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

		eventEmitter.emit("openSelectContactsDialog", {
			id,
			exclude: params && params.excludeUserIds ? params.excludeUserIds : []
		})
	})
}

export const SelectContactsDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const requestId = useRef<string>("")
	const [responseContacts, setResponseContacts] = useState<Contact[]>([])
	const didSubmit = useRef<boolean>(false)
	const [exclude, setExclude] = useState<number[]>([])
	const [search, setSearch] = useState<string>("")

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

	const onOpenChange = useCallback(
		(openState: boolean) => {
			setOpen(openState)
			cancel()
		},
		[cancel]
	)

	const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openSelectContactsDialog", ({ id, exclude: e }: { id: string; exclude: number[] }) => {
			requestId.current = id
			didSubmit.current = false

			setSearch("")
			setExclude(e ? e : [])
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
			onOpenChange={onOpenChange}
		>
			<AlertDialogContent
				onEscapeKeyDown={cancel}
				className="outline-none focus:outline-none active:outline-none hover:outline-none"
			>
				<AlertDialogHeader>
					<AlertDialogTitle className="mb-1">{t("dialogs.selectContacts.title")}</AlertDialogTitle>
					<Input
						value={search}
						onChange={onInputChange}
						placeholder={t("dialogs.selectContacts.title")}
					/>
					<List
						responseContacts={responseContacts}
						setResponseContacts={setResponseContacts}
						exclude={exclude}
						search={search}
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
