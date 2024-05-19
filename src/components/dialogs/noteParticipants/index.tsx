import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { Button } from "@/components/ui/button"
import List from "./list"
import { UserPlus } from "lucide-react"
import { selectContacts } from "../selectContacts"
import worker from "@/lib/worker"
import { promiseAllChunked } from "@/lib/utils"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useSDKConfig from "@/hooks/useSDKConfig"

export const NoteParticipantsDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [note, setNote] = useState<Note | null>(null)
	const { t } = useTranslation()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { userId } = useSDKConfig()

	const add = useCallback(async () => {
		if (!note || note.ownerId !== userId) {
			return
		}

		const selectedContacts = await selectContacts({ excludeUserIds: note.participants.map(p => p.userId) })

		if (selectedContacts.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			const addedContacts: Contact[] = []
			await promiseAllChunked(
				selectedContacts.contacts.map(
					contact =>
						new Promise<void>((resolve, reject) => {
							worker
								.userPublicKey({ email: contact.email })
								.then(publicKey => {
									worker
										.addNoteParticipant({
											uuid: note.uuid,
											contactUUID: contact.uuid,
											permissionsWrite: true,
											publicKey
										})
										.then(() => {
											addedContacts.push(contact)

											resolve()
										})
										.catch(reject)
								})
								.catch(reject)
						})
				)
			)

			setNote(prev =>
				prev
					? {
							...prev,
							participants: [
								...prev.participants,
								...addedContacts.map(contact => ({
									userId: contact.userId,
									isOwner: false,
									email: contact.email,
									avatar: contact.avatar,
									nickName: contact.nickName,
									metadata: "",
									permissionsWrite: true,
									addedTimestamp: Date.now()
								}))
							]
						}
					: prev
			)
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [errorToast, loadingToast, note, userId])

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	useEffect(() => {
		const listener = eventEmitter.on("openNoteParticipantsDialog", (n: Note) => {
			setNote(n)
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
			<DialogContent className="outline-none focus:outline-none active:outline-none hover:outline-none select-none">
				<DialogHeader>{t("dialogs.noteParticipants.title")}</DialogHeader>
				{note && (
					<List
						key={note.uuid}
						note={note}
						setNote={setNote}
					/>
				)}
				<DialogFooter>
					<Button
						onClick={close}
						variant="outline"
					>
						{t("dialogs.noteParticipants.close")}
					</Button>
					{note && userId === note.ownerId && (
						<Button onClick={add}>
							<UserPlus size={18} />
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

export default NoteParticipantsDialog
