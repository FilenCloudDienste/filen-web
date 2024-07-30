import { memo, useMemo } from "react"
import { type IgnoreType } from "./index"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { useTranslation } from "react-i18next"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import pathModule from "path"

export const Ignore = memo(({ ignore }: { ignore: IgnoreType }) => {
	const { t } = useTranslation()

	const itemName = useMemo(() => {
		return pathModule.posix.basename(ignore.relativePath)
	}, [ignore.relativePath])

	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 py-3 gap-3 hover:bg-secondary hover:rounded-sm">
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div className="flex flex-row items-center gap-2.5">
								<img
									src={fileNameToSVGIcon(itemName)}
									className="w-[26px] h-[26px] shrink-0 object-cover"
									draggable={false}
								/>
								<p className="line-clamp-3 text-ellipsis break-all">{ignore.localPath}</p>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{ignore.reason === "dotFile"
									? t("syncs.ignored.reasons.dotFile")
									: ignore.reason === "defaultIgnore"
										? t("syncs.ignored.reasons.defaultIgnore")
										: ignore.reason === "empty"
											? t("syncs.ignored.reasons.empty")
											: t("syncs.ignored.reasons.defaultIgnore")}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	)
})

export default Ignore
