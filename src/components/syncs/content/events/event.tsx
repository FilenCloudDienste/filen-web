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

	// The rename ops now carry from/to; a differing parent directory means the item was MOVED rather than renamed in place.
	// Events produced by an older @filen/sync (e.g. a desktop worker that predates the from/to fields) lack them even
	// though the current types require them, so verify at runtime instead of trusting the compile-time type.
	const isMove = useMemo(() => {
		if (
			(event.of === "renameLocalFile" ||
				event.of === "renameLocalDirectory" ||
				event.of === "renameRemoteFile" ||
				event.of === "renameRemoteDirectory") &&
			event.type === "success"
		) {
			const { from, to } = event as { from?: string; to?: string }

			if (typeof from !== "string" || typeof to !== "string") {
				return false
			}

			return pathModule.posix.dirname(from) !== pathModule.posix.dirname(to)
		}

		return false
	}, [event])

	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 py-3 hover:bg-secondary hover:rounded-sm">
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div className="flex flex-row items-center gap-2.5 min-w-0">
								<div className="flex flex-row items-center shrink-0">
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
								<div className="flex flex-col min-w-0">
									<p className="truncate min-w-0">
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
																					? t(isMove ? "syncs.events.moveLocalDirectory" : "syncs.events.renameLocalDirectory", {
																							name: itemName
																						})
																					: event.of === "renameLocalFile"
																						? t(isMove ? "syncs.events.moveLocalFile" : "syncs.events.renameLocalFile", {
																								name: itemName
																							})
																						: event.of === "renameRemoteDirectory"
																							? t(isMove ? "syncs.events.moveRemoteDirectory" : "syncs.events.renameRemoteDirectory", {
																									name: itemName
																								})
																							: event.of === "renameRemoteFile"
																								? t(isMove ? "syncs.events.moveRemoteFile" : "syncs.events.renameRemoteFile", {
																										name: itemName
																									})
																								: ""}
									</p>
									<p className="truncate min-w-0 text-muted-foreground text-xs">
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
