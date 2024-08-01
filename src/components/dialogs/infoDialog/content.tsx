import { memo, useRef, useMemo, useCallback, useState } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { ColoredFolderSVGIcon, fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { thumbnailURLObjectCache, directoryUUIDToNameCache, directorySizeCache } from "@/cache"
import { useTranslation } from "react-i18next"
import { formatBytes, simpleDate } from "@/utils"
import useLocation from "@/hooks/useLocation"
import useMountedEffect from "@/hooks/useMountedEffect"
import { setItem } from "@/lib/localForage"
import { useDriveSharedStore } from "@/stores/drive.store"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import worker from "@/lib/worker"
import useSDKConfig from "@/hooks/useSDKConfig"
import { validate as validateUUID } from "uuid"
import pathModule from "path"
import { type DirectorySizeResult } from "@/lib/worker/worker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"

export const Content = memo(({ item }: { item: DriveCloudItem }) => {
	const [size, setSize] = useState<number>(item.size)
	const thumbnailURL = useRef<string | null>(
		thumbnailURLObjectCache.has(item.uuid) ? thumbnailURLObjectCache.get(item.uuid)! : null
	).current
	const { t } = useTranslation()
	const location = useLocation()
	const { currentReceiverId, currentSharerId } = useDriveSharedStore(
		useCallback(
			state => ({
				currentReceiverId: state.currentReceiverId,
				currentSharerId: state.currentSharerId
			}),
			[]
		)
	)
	const publicLinkURLState = usePublicLinkURLState()
	const { baseFolderUUID } = useSDKConfig()
	const [dirSize, setDirSize] = useState<DirectorySizeResult>(
		directorySizeCache.has(item.uuid) ? directorySizeCache.get(item.uuid)! : { size: 0, folders: 0, files: 0 }
	)

	const isInsidePublicLink = useMemo(() => {
		return location.includes("/f/") || location.includes("/d/")
	}, [location])

	const itemLocation = useMemo(() => {
		if (!location.includes(item.parent)) {
			return "N/A"
		}

		let built = ""
		const ex = location.split("/")

		for (const part of ex) {
			if (part.length === 0 || !validateUUID(part)) {
				continue
			}

			if (part === baseFolderUUID) {
				continue
			}

			if (directoryUUIDToNameCache.has(part)) {
				built = pathModule.posix.join(built, directoryUUIDToNameCache.get(part)!)
			}
		}

		return pathModule.posix.join(built.startsWith("/") ? built : `/${built}`, item.name)
	}, [location, baseFolderUUID, item.parent, item.name])

	const fetchDirectorySize = useCallback(async () => {
		if (item.type !== "directory") {
			return
		}

		try {
			const directorySize = await worker.directorySize({
				uuid: item.uuid,
				trash: location.includes("trash"),
				sharerId: currentSharerId,
				receiverId: currentReceiverId,
				linkUUID: isInsidePublicLink ? publicLinkURLState.uuid : undefined
			})

			directorySizeCache.set(item.uuid, directorySize)

			setSize(directorySize.size)
			setDirSize(directorySize)

			await setItem("directorySize:" + item.uuid, directorySize)
		} catch (e) {
			console.error(e)
		}
	}, [item.type, item.uuid, location, currentSharerId, currentReceiverId, isInsidePublicLink, publicLinkURLState.uuid])

	useMountedEffect(() => {
		fetchDirectorySize()
	})

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col items-center justify-center gap-4">
				{item.type === "directory" ? (
					<ColoredFolderSVGIcon
						width="8rem"
						height="8rem"
						color={item.color}
					/>
				) : (
					<img
						src={thumbnailURL ? thumbnailURL : fileNameToSVGIcon(item.name)}
						className="dragselect-start-disallowed shrink-0 rounded-md object-cover w-32 h-32"
						draggable={false}
					/>
				)}
				<p className="line-clamp-1 text-ellipsis break-all">{item.name}</p>
			</div>
			<div className="flex flex-row h-[1px] bg-border my-3" />
			<div className="flex flex-row items-center gap-3">
				<div className="flex flex-col gap-0.5 w-[49%]">
					<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.name")}</p>
					<p className="line-clamp-1 text-ellipsis break-all">{item.name}</p>
				</div>
				<div className="flex flex-col gap-0.5 w-[49%]">
					<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.size")}</p>
					<p className="line-clamp-1 text-ellipsis break-all">{formatBytes(size)}</p>
				</div>
			</div>
			{item.type === "directory" && (
				<div className="flex flex-row items-center gap-3">
					<div className="flex flex-col gap-0.5 w-[49%]">
						<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.directories")}</p>
						<p className="line-clamp-1 text-ellipsis break-all">{dirSize.folders}</p>
					</div>
					<div className="flex flex-col gap-0.5 w-[49%]">
						<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.files")}</p>
						<p className="line-clamp-1 text-ellipsis break-all">{dirSize.files}</p>
					</div>
				</div>
			)}
			<div className="flex flex-row items-center gap-3">
				<div className="flex flex-col gap-0.5 w-[49%]">
					<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.type")}</p>
					<p className="line-clamp-1 text-ellipsis break-all">
						{item.type === "file" ? item.mime : t("dialogs.info.directoryType")}
					</p>
				</div>
				<div className="flex flex-col gap-0.5 w-[49%]">
					<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.location")}</p>
					<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
						<Tooltip>
							<TooltipTrigger asChild={true}>
								<p className="line-clamp-1 text-ellipsis break-all">{itemLocation}</p>
							</TooltipTrigger>
							<TooltipContent className="max-w-[calc(100vw/2)]">
								<p>{itemLocation}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
			<div className="flex flex-row items-center gap-3">
				<div className="flex flex-col gap-0.5 w-[49%]">
					<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.modified")}</p>
					<p className="line-clamp-1 text-ellipsis break-all">{simpleDate(item.lastModified)}</p>
				</div>
				<div className="flex flex-col gap-0.5 w-[49%]">
					<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">{t("dialogs.info.uploaded")}</p>
					<p className="line-clamp-1 text-ellipsis break-all">{simpleDate(item.timestamp)}</p>
				</div>
			</div>
		</div>
	)
})

export default Content
