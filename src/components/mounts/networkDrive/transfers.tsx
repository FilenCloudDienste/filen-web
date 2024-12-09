import { memo } from "react"
import { useTranslation } from "react-i18next"
import { RefreshCw, CheckCircle } from "lucide-react"
import { bpsToReadable } from "@/components/transfers/utils"
import useNetworkDriveStats from "@/hooks/useNetworkDriveStats"

export const Transfers = memo(() => {
	const { t } = useTranslation()
	const { uploadsInProgress, speed } = useNetworkDriveStats()

	return (
		<div className="flex flex-row w-full px-4 pb-4">
			<div className="flex flex-col h-10 bg-secondary rounded-sm w-full">
				<div className="flex flex-row h-full w-full items-center px-4 justify-between gap-4">
					<div className="flex flex-row h-full w-full items-center gap-2 text-sm text-ellipsis line-clamp-1 break-all">
						{uploadsInProgress > 0 && speed > 0 ? (
							<>
								<RefreshCw
									className="animate-spin-medium text-primary"
									size={16}
								/>
								<p>
									{speed > 0
										? t(
												uploadsInProgress <= 1
													? "mounts.networkDrive.transfers.uploadingSpeed"
													: "mounts.networkDrive.transfers.uploadingPluralSpeed",
												{
													total: uploadsInProgress,
													speed: bpsToReadable(speed)
												}
											)
										: t(
												uploadsInProgress <= 1
													? "mounts.networkDrive.transfers.uploading"
													: "mounts.networkDrive.transfers.uploadingPlural",
												{
													total: uploadsInProgress
												}
											)}
								</p>
							</>
						) : (
							<>
								<CheckCircle
									className="text-green-500"
									size={16}
								/>
								<p>{t("mounts.networkDrive.transfers.everythingUploaded")}</p>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	)
})

export default Transfers
