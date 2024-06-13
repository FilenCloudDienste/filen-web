import { memo, useCallback } from "react"
import Avatar from "../../avatar"
import { Check } from "lucide-react"
import { type BlockedContact } from "@filen/sdk/dist/types/api/v3/contacts/blocked"
import worker from "@/lib/worker"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useTranslation } from "react-i18next"

export const Blocked = memo(({ blocked, refetch }: { blocked: BlockedContact; refetch: () => Promise<void> }) => {
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { t } = useTranslation()

	const unblock = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: t("contacts.dialogs.unblock.title"),
				continueButtonText: t("contacts.dialogs.unblock.continue"),
				description: t("contacts.dialogs.unblock.description", {
					name: blocked.nickName.length > 0 ? blocked.nickName : blocked.email
				}),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.unblockUser({ uuid: blocked.uuid })
			await refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [blocked.uuid, errorToast, loadingToast, refetch, t, blocked.nickName, blocked.email])

	return (
		<div className="flex flex-row gap-3 items-center hover:bg-secondary rounded-md p-3">
			<Avatar
				size={44}
				src={blocked.avatar}
			/>
			<div className="flex flex-row gap-4 items-center justify-between grow">
				<div className="flex flex-col">
					<p className="line-clamp-1 text-ellipsis break-all">{blocked.nickName.length > 0 ? blocked.nickName : blocked.email}</p>
					<p className="line-clamp-1 text-ellipsis break-all text-sm text-muted-foreground">{blocked.email}</p>
				</div>
				<div
					className="bg-green-500 w-8 h-8 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
					onClick={unblock}
				>
					<Check size={18} />
				</div>
			</div>
		</div>
	)
})

export default Blocked
