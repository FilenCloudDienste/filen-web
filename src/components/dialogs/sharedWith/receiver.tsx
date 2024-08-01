import { memo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { X } from "lucide-react"
import { type CloudItemReceiver } from "@filen/sdk/dist/types/cloud"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type DriveCloudItem } from "@/components/drive"
import worker from "@/lib/worker"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { useDriveItemsStore } from "@/stores/drive.store"
import useLocation from "@/hooks/useLocation"
import { showConfirmDialog } from "../confirm"

export const Receiver = memo(
	({
		receiver,
		setItem,
		item,
		setOpen
	}: {
		receiver: CloudItemReceiver
		setItem: React.Dispatch<React.SetStateAction<DriveCloudItem | null>>
		item: DriveCloudItem
		setOpen: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const { t } = useTranslation()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const setItems = useDriveItemsStore(useCallback(state => state.setItems, []))
		const location = useLocation()

		const remove = useCallback(
			async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				if (!e.shiftKey) {
					if (
						!(await showConfirmDialog({
							title: t("dialogs.sharedWith.stopSharing.title"),
							continueButtonText: t("dialogs.sharedWith.stopSharing.continue"),
							description: t("dialogs.sharedWith.stopSharing.description", {
								item: item.name,
								name: receiver.email
							}),
							continueButtonVariant: "destructive"
						}))
					) {
						return
					}
				}

				const toast = loadingToast()

				try {
					await worker.stopSharingItem({ uuid: item.uuid, receiverId: receiver.id })

					setItem(prev => {
						if (!prev) {
							return prev
						}

						const newReceivers = prev.receivers.filter(r => r.id !== receiver.id)

						if (newReceivers.length === 0 && location.includes("shared-out")) {
							setItems(prev => prev.filter(itm => itm.uuid !== item.uuid))
							setTimeout(() => setOpen(false), 100)
						}

						return {
							...prev,
							receivers: newReceivers
						}
					})
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				} finally {
					toast.dismiss()
				}
			},
			[errorToast, loadingToast, item.uuid, receiver.id, setItem, location, setItems, setOpen, t, receiver.email, item.name]
		)

		return (
			<div className="flex flex-row gap-2 items-center p-2 rounded-md justify-between hover:bg-secondary mb-1">
				<p className="line-clamp-1 text-ellipsis break-all">{receiver.email}</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="bg-red-500 w-6 h-6 rounded-full flex flex-row justify-center items-center text-white cursor-pointer"
								onClick={remove}
							>
								<X size={14} />
							</div>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p>{t("dialogs.sharedWith.remove")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		)
	}
)

export default Receiver
