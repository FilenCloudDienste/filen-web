import { memo, useMemo } from "react"
import { type TransferDataWithTimestamp } from "@/stores/syncs.store"
import { ColoredFolderSVGIcon, fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import pathModule from "path"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { simpleDate } from "@/utils"

export const Event = memo(({ event }: { event: TransferDataWithTimestamp }) => {
	const { t } = useTranslation()

	const itemName = useMemo(() => {
		return pathModule.posix.basename(event.relativePath)
	}, [event.relativePath])

	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 py-3 hover:bg-secondary hover:rounded-sm">
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div className="flex flex-row items-center gap-2.5">
								<div className="flex flex-row items-center">
									<div className="bg-secondary rounded-md flex items-center justify-center aspect-square w-10">
										{event.of === "createLocalDirectory" ||
										event.of === "renameLocalDirectory" ||
										event.of === "deleteLocalDirectory" ||
										event.of === "createRemoteDirectory" ||
										event.of === "renameRemoteDirectory" ||
										event.of === "deleteRemoteDirectory" ? (
											<ColoredFolderSVGIcon
												width={26}
												height={26}
											/>
										) : (
											<img
												src={fileNameToSVGIcon(itemName)}
												className="w-[26px] h-[26px] shrink-0 object-cover"
												draggable={false}
											/>
										)}
									</div>
								</div>
								<div className="flex flex-col">
									<p className="line-clamp-1 text-ellipsis break-all">
										{event.of === "createLocalDirectory"
											? t("syncs.events.createLocalDirectory", { name: itemName })
											: event.of === "createRemoteDirectory"
												? t("syncs.events.createRemoteDirectory", { name: itemName })
												: event.of === "deleteLocalDirectory"
													? t("syncs.events.deleteLocalDirectory", { name: itemName })
													: event.of === "deleteLocalFile"
														? t("syncs.events.deleteLocalFile", { name: itemName })
														: event.of === "deleteRemoteDirectory"
															? t("syncs.events.deleteRemoteDirectory", { name: itemName })
															: event.of === "deleteRemoteFile"
																? t("syncs.events.deleteRemoteFile", { name: itemName })
																: event.of === "download"
																	? t("syncs.events.download", { name: itemName })
																	: event.of === "upload"
																		? t("syncs.events.upload", { name: itemName })
																		: event.of === "downloadFile"
																			? t("syncs.events.download", { name: itemName })
																			: event.of === "uploadFile"
																				? t("syncs.events.upload", { name: itemName })
																				: event.of === "renameLocalDirectory"
																					? t("syncs.events.renameLocalDirectory", {
																							name: itemName
																						})
																					: event.of === "renameLocalFile"
																						? t("syncs.events.renameLocalFile", {
																								name: itemName
																							})
																						: event.of === "renameRemoteDirectory"
																							? t("syncs.events.renameRemoteDirectory", {
																									name: itemName
																								})
																							: event.of === "renameRemoteFile"
																								? t("syncs.events.renameRemoteFile", {
																										name: itemName
																									})
																								: ""}
									</p>
									<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground text-xs">
										{simpleDate(event.timestamp)}
									</p>
								</div>
							</div>
						</TooltipTrigger>
						<TooltipContent className="max-w-[calc(100vw/2)]">
							<p className="line-clamp-6 break-all">
								{event.of === "createLocalDirectory" ||
								event.of === "deleteLocalDirectory" ||
								event.of === "deleteLocalFile" ||
								event.of === "renameLocalDirectory" ||
								event.of === "renameLocalFile" ||
								event.of === "download" ||
								event.of === "downloadFile"
									? event.localPath
									: event.relativePath}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	)
})

export default Event
