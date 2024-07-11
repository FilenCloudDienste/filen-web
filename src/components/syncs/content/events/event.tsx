import { memo, useMemo } from "react"
import { type TransferDataWithTimestamp } from "@/stores/syncs.store"
import { ColoredFolderSVGIcon, fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import pathModule from "path"

export const Event = memo(({ event }: { event: TransferDataWithTimestamp }) => {
	const itemName = useMemo(() => {
		return pathModule.posix.basename(event.relativePath)
	}, [event.relativePath])

	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 gap-2 hover:bg-secondary hover:rounded-sm">
				{event.of === "createLocalDirectory" ||
				event.of === "renameLocalDirectory" ||
				event.of === "deleteLocalDirectory" ||
				event.of === "createRemoteDirectory" ||
				event.of === "renameRemoteDirectory" ||
				event.of === "deleteRemoteDirectory" ? (
					<ColoredFolderSVGIcon
						width={28}
						height={28}
					/>
				) : (
					<img
						src={fileNameToSVGIcon(itemName)}
						className="w-[28px] h-[28px] shrink-0 object-cover"
						draggable={false}
					/>
				)}
				<p>
					{event.of} {itemName}
				</p>
			</div>
		</div>
	)
})

export default Event
