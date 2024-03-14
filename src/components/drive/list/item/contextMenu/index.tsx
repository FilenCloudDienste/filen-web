import { memo, useMemo, useCallback } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent
} from "@/components/ui/context-menu"
import { type DriveCloudItem } from "../../.."
import { downloadFile } from "@/lib/worker/proxy"
import { useDriveItemsStore } from "@/stores/drive.store"
import { useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import MoveTree from "./moveTree"
import useSDKConfig from "@/hooks/useSDKConfig"
import { selectDriveDestination } from "@/components/dialogs/selectDriveDestination"

export const ContextMenu = memo(({ item, children }: { item: DriveCloudItem; children: React.ReactNode }) => {
	const { items } = useDriveItemsStore()
	const routerState = useRouterState()
	const { t } = useTranslation()
	const sdkConfig = useSDKConfig()

	const selectedItems = useMemo(() => {
		return items.filter(item => item.selected)
	}, [items])

	const urlState = useMemo(() => {
		return {
			drive: routerState.location.pathname.includes("drive"),
			trash: routerState.location.pathname.includes("trash"),
			recents: routerState.location.pathname.includes("recents"),
			favorites: routerState.location.pathname.includes("favorites"),
			sharedIn: routerState.location.pathname.includes("shared-in"),
			sharedOut: routerState.location.pathname.includes("shared-out"),
			links: routerState.location.pathname.includes("links")
		}
	}, [routerState.location.pathname])

	const move = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			const parent = await selectDriveDestination()

			console.log("move", selectedItems.length, "to", parent)
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems])

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				{!urlState.sharedIn && !urlState.trash && selectedItems.length === 1 && item.type === "file" && (
					<ContextMenuItem
						onClick={() => downloadFile({ item })}
						className="cursor-pointer"
					>
						{t("contextMenus.item.edit")}
					</ContextMenuItem>
				)}
				{selectedItems.length === 1 && item.type === "file" && (
					<ContextMenuItem
						onClick={() => downloadFile({ item })}
						className="cursor-pointer"
					>
						{t("contextMenus.item.preview")}
					</ContextMenuItem>
				)}
				<ContextMenuItem
					onClick={() => downloadFile({ item })}
					className="cursor-pointer"
				>
					{t("contextMenus.item.download")}
					<ContextMenuShortcut>⌘ [</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuSeparator />
				{selectedItems.length === 1 && !urlState.sharedIn && !urlState.trash && (
					<ContextMenuItem
						onClick={() => downloadFile({ item })}
						className="cursor-pointer"
					>
						{t("contextMenus.item.publicLink")}
					</ContextMenuItem>
				)}
				{!urlState.sharedIn && !urlState.trash && (
					<>
						<ContextMenuItem
							onClick={() => downloadFile({ item })}
							className="cursor-pointer"
						>
							{t("contextMenus.item.share")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{item.type === "file" && selectedItems.length === 1 && !urlState.sharedIn && !urlState.trash && (
					<>
						<ContextMenuItem
							onClick={() => downloadFile({ item })}
							className="cursor-pointer"
						>
							{t("contextMenus.item.versions")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{!urlState.sharedIn && !urlState.trash && (
					<>
						<ContextMenuItem
							onClick={() => downloadFile({ item })}
							className="cursor-pointer"
						>
							{t("contextMenus.item.favorite")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{selectedItems.length === 0 && !urlState.sharedIn && !urlState.trash && (
					<ContextMenuItem
						onClick={() => downloadFile({ item })}
						className="cursor-pointer"
					>
						{t("contextMenus.item.rename")}
					</ContextMenuItem>
				)}
				{!urlState.sharedIn && !urlState.trash && (
					<>
						<ContextMenuSub>
							<ContextMenuSubTrigger
								className="cursor-pointer"
								onClick={e => e.stopPropagation()}
							>
								{t("contextMenus.item.move")}
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								<ContextMenuItem
									onClick={move}
									className="cursor-pointer"
								>
									{t("contextMenus.item.selectDestination")}
								</ContextMenuItem>
								<ContextMenuSeparator />
								<MoveTree
									parent={sdkConfig.baseFolderUUID}
									name={t("contextMenus.item.cloudDrive")}
								/>
							</ContextMenuSubContent>
						</ContextMenuSub>
						<ContextMenuSeparator />
					</>
				)}
				{urlState.trash && (
					<>
						<ContextMenuItem
							onClick={() => downloadFile({ item })}
							className="cursor-pointer"
						>
							{t("contextMenus.item.restore")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{!urlState.sharedIn && (
					<ContextMenuItem
						onClick={() => downloadFile({ item })}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.item.trash")}
					</ContextMenuItem>
				)}
				{urlState.sharedIn && (
					<ContextMenuItem
						onClick={() => downloadFile({ item })}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.item.remove")}
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
