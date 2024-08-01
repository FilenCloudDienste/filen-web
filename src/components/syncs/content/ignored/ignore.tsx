import { memo, useMemo } from "react"
import { type IgnoreType } from "./index"
import { useTranslation } from "react-i18next"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import pathModule from "path"

export const Ignore = memo(({ ignore }: { ignore: IgnoreType }) => {
	const { t } = useTranslation()

	const itemName = useMemo(() => {
		return pathModule.posix.basename(ignore.relativePath)
	}, [ignore.relativePath])

	const reason = useMemo(() => {
		return ignore.reason === "dotFile"
			? t("syncs.ignored.reasons.dotFile")
			: ignore.reason === "defaultIgnore"
				? t("syncs.ignored.reasons.defaultIgnore")
				: ignore.reason === "empty"
					? t("syncs.ignored.reasons.empty")
					: ignore.reason === "invalidPath"
						? t("syncs.ignored.reasons.invalidPath")
						: ignore.reason === "symlink"
							? t("syncs.ignored.reasons.symlink")
							: ignore.reason === "duplicate"
								? t("syncs.ignored.reasons.duplicate")
								: ignore.reason === "filenIgnore"
									? t("syncs.ignored.reasons.filenIgnore")
									: ignore.reason === "invalidType"
										? t("syncs.ignored.reasons.invalidType")
										: ignore.reason === "nameLength"
											? t("syncs.ignored.reasons.nameLength")
											: ignore.reason === "pathLength"
												? t("syncs.ignored.reasons.pathLength")
												: ignore.reason === "permissions"
													? t("syncs.ignored.reasons.permissions")
													: t("syncs.ignored.reasons.defaultIgnore")
	}, [ignore.reason, t])

	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 py-3 hover:bg-secondary hover:rounded-sm">
				<div className="flex flex-row items-center gap-2.5">
					<div className="flex flex-row items-center">
						<div className="bg-secondary rounded-md flex items-center justify-center aspect-square w-10">
							<img
								src={fileNameToSVGIcon(itemName)}
								className="w-[26px] h-[26px] shrink-0 object-cover"
								draggable={false}
							/>
						</div>
					</div>
					<div className="flex flex-col">
						<p className="line-clamp-1 text-ellipsis break-all">{ignore.localPath}</p>
						<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground text-xs">{reason}</p>
					</div>
				</div>
			</div>
		</div>
	)
})

export default Ignore
