import { memo, useMemo, useCallback, useTransition } from "react"
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
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { useTranslation } from "react-i18next"
import MoveTree from "./moveTree"
import useSDKConfig from "@/hooks/useSDKConfig"
import { CTRL_KEY_TEXT } from "@/constants"
import * as actions from "./actions"
import { selectDriveDestination } from "@/components/dialogs/selectDriveDestination"
import eventEmitter from "@/lib/eventEmitter"
import { fileNameToPreviewType } from "@/components/dialogs/previewDialog/utils"
import useDriveURLState from "@/hooks/useDriveURLState"
import { useNavigate, useRouterState } from "@tanstack/react-router"

export const ContextMenu = memo(({ item, children }: { item: DriveCloudItem; children: React.ReactNode }) => {
	const { items, setItems } = useDriveItemsStore()
	const { t } = useTranslation()
	const sdkConfig = useSDKConfig()
	const [, startTransition] = useTransition()
	const driveURLState = useDriveURLState()
	const navigate = useNavigate()
	const { setCurrentReceiverEmail, setCurrentReceiverId, setCurrentReceivers, setCurrentSharerEmail, setCurrentSharerId } =
		useDriveSharedStore()
	const routerState = useRouterState()

	const selectedItems = useMemo(() => {
		return items.filter(item => item.selected)
	}, [items])

	const previewType = useMemo(() => {
		if (!item) {
			return "other"
		}

		return fileNameToPreviewType(item.name)
	}, [item])

	const openDirectory = useCallback(() => {
		if (item.type === "directory" && !routerState.location.pathname.includes("trash")) {
			setCurrentReceiverId(item.receiverId)
			setCurrentReceiverEmail(item.receiverEmail)
			setCurrentSharerId(item.sharerId)
			setCurrentSharerEmail(item.sharerEmail)
			setCurrentReceivers(item.receivers)

			navigate({
				to: "/drive/$",
				params: {
					_splat: `${routerState.location.pathname.split("/drive/").join("")}/${item.uuid}`
				}
			})

			return
		}
	}, [
		navigate,
		routerState,
		item,
		setCurrentReceiverId,
		setCurrentReceiverEmail,
		setCurrentSharerId,
		setCurrentSharerEmail,
		setCurrentReceivers
	])

	const move = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			const parent = await selectDriveDestination()

			if (parent.cancelled) {
				return
			}

			const itemsToMove = selectedItems.filter(item => item.parent !== parent.uuid)
			const movedUUIDs = itemsToMove.map(item => item.uuid)

			await actions.move({ selectedItems: itemsToMove, parent: parent.uuid })

			startTransition(() => {
				setItems(prev => prev.filter(prevItem => !movedUUIDs.includes(prevItem.uuid)))
			})
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems, setItems])

	const download = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			await actions.download({ selectedItems })
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems])

	const trash = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			const trashedUUIDs = selectedItems.map(item => item.uuid)

			if (!(await actions.trash({ selectedItems }))) {
				return
			}

			startTransition(() => {
				setItems(prev => prev.filter(prevItem => !trashedUUIDs.includes(prevItem.uuid)))
			})
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems, setItems])

	const deletePermanently = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			const deletedUUIDs = selectedItems.map(item => item.uuid)

			if (!(await actions.deletePermanently({ selectedItems }))) {
				return
			}

			startTransition(() => {
				setItems(prev => prev.filter(prevItem => !deletedUUIDs.includes(prevItem.uuid)))
			})
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems, setItems])

	const restore = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			const restoredUUIDs = selectedItems.map(item => item.uuid)

			await actions.restore({ selectedItems })

			startTransition(() => {
				setItems(prev => prev.filter(prevItem => !restoredUUIDs.includes(prevItem.uuid)))
			})
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems, setItems])

	const preview = useCallback(() => {
		if (selectedItems.length !== 1 && previewType !== "other") {
			return
		}

		eventEmitter.emit("openPreviewModal", { item: selectedItems[0] })
	}, [selectedItems, previewType])

	const rename = useCallback(async () => {
		if (selectedItems.length !== 1) {
			return
		}

		try {
			const item = selectedItems[0]
			const newName = await actions.rename({ item })

			startTransition(() => {
				setItems(prev => prev.map(prevItem => (prevItem.uuid === item.uuid ? { ...prevItem, name: newName } : prevItem)))
			})
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems, setItems])

	const toggleFavorite = useCallback(
		async (favorite: boolean) => {
			if (selectedItems.length === 0) {
				return
			}

			try {
				const uuids = selectedItems.map(item => item.uuid)

				await actions.favorite({ selectedItems, favorite })

				startTransition(() => {
					setItems(prev =>
						prev.map(prevItem => (uuids.includes(prevItem.uuid) ? { ...prevItem, favorited: favorite } : prevItem))
					)
				})
			} catch (e) {
				console.error(e)
			}
		},
		[selectedItems, setItems]
	)

	const share = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		try {
			await actions.share({ selectedItems })
		} catch (e) {
			console.error(e)
		}
	}, [selectedItems])

	return (
		<CM>
			<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				{selectedItems.length === 1 && item.type === "file" && previewType !== "other" && (
					<ContextMenuItem
						onClick={preview}
						className="cursor-pointer"
					>
						{t("contextMenus.item.preview")}
					</ContextMenuItem>
				)}
				{selectedItems.length === 1 && item.type === "directory" && (
					<>
						<ContextMenuItem
							onClick={openDirectory}
							className="cursor-pointer"
						>
							{t("contextMenus.item.open")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				<ContextMenuItem
					onClick={download}
					className="cursor-pointer"
				>
					{t("contextMenus.item.download")}
					<ContextMenuShortcut>{CTRL_KEY_TEXT} + S</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuSeparator />
				{selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && (
					<ContextMenuItem
						onClick={download}
						className="cursor-pointer"
					>
						{t("contextMenus.item.publicLink")}
					</ContextMenuItem>
				)}
				{!driveURLState.sharedIn && !driveURLState.trash && (
					<>
						<ContextMenuItem
							onClick={share}
							className="cursor-pointer"
						>
							{t("contextMenus.item.share")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{item.type === "file" && selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && (
					<>
						<ContextMenuItem
							onClick={download}
							className="cursor-pointer"
						>
							{t("contextMenus.item.versions")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{!driveURLState.sharedIn && !driveURLState.trash && (
					<>
						<ContextMenuItem
							onClick={() => toggleFavorite(!item.favorited)}
							className="cursor-pointer"
						>
							{item.favorited ? t("contextMenus.item.unfavorite") : t("contextMenus.item.favorite")}
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}
				{selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && (
					<ContextMenuItem
						onClick={rename}
						className="cursor-pointer"
					>
						{t("contextMenus.item.rename")}
					</ContextMenuItem>
				)}
				{!driveURLState.sharedIn && !driveURLState.trash && (
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
				{driveURLState.trash && (
					<>
						<ContextMenuItem
							onClick={restore}
							className="cursor-pointer"
						>
							{t("contextMenus.item.restore")}
						</ContextMenuItem>
					</>
				)}
				{!driveURLState.sharedIn && !driveURLState.trash && (
					<ContextMenuItem
						onClick={trash}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.item.trash")}
					</ContextMenuItem>
				)}
				{driveURLState.sharedIn && (
					<ContextMenuItem
						onClick={download}
						className="cursor-pointer text-red-500"
					>
						{t("contextMenus.item.remove")}
					</ContextMenuItem>
				)}
				{driveURLState.trash && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem
							onClick={deletePermanently}
							className="cursor-pointer text-red-500"
						>
							{t("contextMenus.item.deletePermanently")}
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</CM>
	)
})

export default ContextMenu
