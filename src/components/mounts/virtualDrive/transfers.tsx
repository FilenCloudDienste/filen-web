import { memo, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { RefreshCw, CheckCircle } from "lucide-react"
import { bpsToReadable } from "@/components/transfers/utils"

export const Transfers = memo(() => {
	const { t } = useTranslation()

	const query = useQuery({
		queryKey: ["virtualDriveStats"],
		queryFn: () => window.desktopAPI.virtualDriveStats(),
		refetchInterval: 1000,
		refetchIntervalInBackground: true,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true
	})

	const speed = useMemo(() => {
		if (!query.isSuccess || query.data.transfers.length === 0) {
			return 0
		}

		return Math.max(...query.data.transfers.map(transfer => transfer.speed))
	}, [query.isSuccess, query.data])

	if (!query.isSuccess) {
		return null
	}

	return (
		<div className="flex flex-row h-12 w-full pt-2">
			<div className="flex flex-row w-full px-4 pb-4">
				<div className="flex flex-col h-10 bg-secondary rounded-sm w-full">
					<div className="flex flex-row h-full w-full items-center px-4 justify-between gap-4">
						<div className="flex flex-row h-full w-full items-center gap-2 text-sm">
							{query.data.uploadsInProgress + query.data.uploadsQueued > 0 ? (
								<>
									<RefreshCw
										className="animate-spin-medium text-primary"
										size={16}
									/>
									<p>
										{speed > 0
											? t(
													query.data.uploadsInProgress + query.data.uploadsQueued <= 1
														? "mounts.virtualDrive.transfers.uploadingSpeed"
														: "mounts.virtualDrive.transfers.uploadingPluralSpeed",
													{
														total: query.data.uploadsInProgress + query.data.uploadsQueued,
														speed: bpsToReadable(speed)
													}
												)
											: t(
													query.data.uploadsInProgress + query.data.uploadsQueued <= 1
														? "mounts.virtualDrive.transfers.uploading"
														: "mounts.virtualDrive.transfers.uploadingPlural",
													{
														total: query.data.uploadsInProgress + query.data.uploadsQueued
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
									<p>{t("mounts.virtualDrive.transfers.everythingUploaded")}</p>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
})

export default Transfers
