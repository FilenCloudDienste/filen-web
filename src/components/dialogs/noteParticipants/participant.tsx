import { memo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { X, Crown, Edit, Eye } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import worker from "@/lib/worker"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { showConfirmDialog } from "../confirm"
import { type Note, type NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import Avatar from "@/components/avatar"

export const Participant = memo(
	({
		participant,
		setNote,
		note,
		userId
	}: {
		participant: NoteParticipant
		setNote: React.Dispatch<React.SetStateAction<Note | null>>
		note: Note
		userId: number
	}) => {
		const { t } = useTranslation()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()

		const remove = useCallback(
			async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				if (userId === participant.userId) {
					return
				}

				if (!e.shiftKey) {
					if (
						!(await showConfirmDialog({
							title: t("notes.dialogs.removeParticipant.title"),
							continueButtonText: t("notes.dialogs.removeParticipant.continue"),
							description: t("notes.dialogs.removeParticipant.description", {
								name: participant.nickName.length > 0 ? participant.nickName : participant.email
							}),
							continueButtonVariant: "destructive"
						}))
					) {
						return
					}
				}

				const toast = loadingToast()

				try {
					await worker.removeNoteParticipant({
						uuid: note.uuid,
						userId: participant.userId
					})

					setNote(prev =>
						prev ? { ...prev, participants: prev.participants.filter(p => p.userId !== participant.userId) } : prev
					)
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				} finally {
					toast.dismiss()
				}
			},
			[errorToast, loadingToast, userId, participant.userId, note.uuid, setNote, t, participant.nickName, participant.email]
		)

		const togglePermissions = useCallback(async () => {
			if (userId === participant.userId) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.noteParticipantPermissions({
					uuid: note.uuid,
					userId: participant.userId,
					permissionsWrite: !participant.permissionsWrite
				})

				setNote(prev =>
					prev
						? {
								...prev,
								participants: prev.participants.map(p =>
									p.userId === participant.userId ? { ...p, permissionsWrite: !p.permissionsWrite } : p
								)
							}
						: prev
				)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [errorToast, loadingToast, userId, participant.userId, note.uuid, setNote, participant.permissionsWrite])

		return (
			<div className="flex flex-row gap-4 items-center p-2 rounded-md justify-between hover:bg-secondary mb-1">
				<div className="flex flex-row gap-2 items-center">
					<Avatar
						src={participant.avatar}
						size={24}
					/>
					{participant.userId === note.ownerId && (
						<Crown
							className="text-yellow-500"
							size={16}
						/>
					)}
					<p className="line-clamp-1 text-ellipsis break-all">{participant.email}</p>
				</div>
				{userId !== participant.userId && userId === note.ownerId && (
					<div className="flex flex-row gap-2 items-center">
						<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
							<Tooltip>
								<TooltipTrigger asChild={true}>
									<div
										className="bg-secondary hover:bg-primary-foreground w-7 h-7 shrink-0 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
										onClick={togglePermissions}
									>
										{participant.permissionsWrite ? <Edit size={14} /> : <Eye size={14} />}
									</div>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>
										{t(
											participant.permissionsWrite
												? "dialogs.noteParticipants.toggleReadPermissions"
												: "dialogs.noteParticipants.toggleWritePermissions"
										)}
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
							<Tooltip>
								<TooltipTrigger asChild={true}>
									<div
										className="bg-red-500 w-7 h-7 shrink-0 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
										onClick={remove}
									>
										<X size={14} />
									</div>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>{t("dialogs.noteParticipants.remove")}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				)}
			</div>
		)
	}
)

export default Participant
