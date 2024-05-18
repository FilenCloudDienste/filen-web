import { memo, useMemo, useCallback, useState } from "react"
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
import { selectDriveItem } from "@/components/dialogs/selectDriveItem"
import eventEmitter from "@/lib/eventEmitter"
import { fileNameToPreviewType } from "@/components/dialogs/previewDialog/utils"
import useDriveURLState from "@/hooks/useDriveURLState"
import { useNavigate } from "@tanstack/react-router"
import useLocation from "@/hooks/useLocation"
import { HexColorPicker } from "react-colorful"
import { useDebouncedCallback } from "use-debounce"
import { directoryColorToHex } from "@/assets/fileExtensionIcons"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"

export const ContextMenu = memo(({ item, children }: { item: DriveCloudItem; children: React.ReactNode }) => {
	const { items, setItems } = useDriveItemsStore()
	const { t } = useTranslation()
	const { baseFolderUUID } = useSDKConfig()
	const driveURLState = useDriveURLState()
	const navigate = useNavigate()
	const { setCurrentReceiverEmail, setCurrentReceiverId, setCurrentReceivers, setCurrentSharerEmail, setCurrentSharerId } =
		useDriveSharedStore()
	const location = useLocation()
	const [directoryColor, setDirectoryColor] = useState<string>(directoryColorToHex(item.type === "directory" ? item.color : null))
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

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
		if (item.type === "directory" && !location.includes("trash")) {
			setCurrentReceiverId(item.receiverId)
			setCurrentReceiverEmail(item.receiverEmail)
			setCurrentSharerId(item.sharerId)
			setCurrentSharerEmail(item.sharerEmail)
			setCurrentReceivers(item.receivers)

			navigate({
				to: "/drive/$",
				params: {
					_splat: `${location.split("/drive/").join("")}/${item.uuid}`
				}
			})

			return
		}
	}, [
		navigate,
		location,
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

		const parent = await selectDriveItem({
			type: "directory",
			multiple: false
		})

		if (parent.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			const itemsToMove = selectedItems.filter(item => item.parent !== parent.items[0].uuid)
			const movedUUIDs = itemsToMove.map(item => item.uuid)

			await actions.move({ selectedItems: itemsToMove, parent: parent.items[0].uuid })

			setItems(prev => prev.filter(prevItem => !movedUUIDs.includes(prevItem.uuid)))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedItems, setItems, errorToast, loadingToast])

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

		const toast = loadingToast()

		try {
			const trashedUUIDs = selectedItems.map(item => item.uuid)

			if (!(await actions.trash({ selectedItems }))) {
				return
			}

			setItems(prev => prev.filter(prevItem => !trashedUUIDs.includes(prevItem.uuid)))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedItems, setItems, loadingToast, errorToast])

	const deletePermanently = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		const toast = loadingToast()

		try {
			const deletedUUIDs = selectedItems.map(item => item.uuid)

			if (!(await actions.deletePermanently({ selectedItems }))) {
				return
			}

			setItems(prev => prev.filter(prevItem => !deletedUUIDs.includes(prevItem.uuid)))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedItems, setItems, loadingToast, errorToast])

	const restore = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		const toast = loadingToast()

		try {
			const restoredUUIDs = selectedItems.map(item => item.uuid)

			await actions.restore({ selectedItems })

			setItems(prev => prev.filter(prevItem => !restoredUUIDs.includes(prevItem.uuid)))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedItems, setItems, loadingToast, errorToast])

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

		const toast = loadingToast()

		try {
			const item = selectedItems[0]
			const newName = await actions.rename({ item })

			setItems(prev => prev.map(prevItem => (prevItem.uuid === item.uuid ? { ...prevItem, name: newName } : prevItem)))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedItems, setItems, loadingToast, errorToast])

	const toggleFavorite = useCallback(
		async (favorite: boolean) => {
			if (selectedItems.length === 0) {
				return
			}

			const toast = loadingToast()

			try {
				const uuids = selectedItems.map(item => item.uuid)

				await actions.favorite({ selectedItems, favorite })

				if (location.includes("favorites") && !favorite) {
					setItems(prev => prev.filter(prevItem => !uuids.includes(prevItem.uuid)))
				} else {
					setItems(prev =>
						prev.map(prevItem => (uuids.includes(prevItem.uuid) ? { ...prevItem, favorited: favorite } : prevItem))
					)
				}
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[selectedItems, setItems, errorToast, loadingToast, location]
	)

	const share = useCallback(async () => {
		if (selectedItems.length === 0) {
			return
		}

		const toast = loadingToast()

		try {
			await actions.share({ selectedItems })
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [selectedItems, loadingToast, errorToast])

	const changeColor = useDebouncedCallback(async (color: string) => {
		if (selectedItems.length !== 1) {
			return
		}

		const toast = loadingToast()

		try {
			await actions.changeColor({ uuid: selectedItems[0].uuid, color })

			setItems(prev => prev.map(prevItem => (prevItem.uuid === selectedItems[0].uuid ? { ...prevItem, color } : prevItem)))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, 500)

	const onColorPickerChange = useCallback(
		(newColor: string) => {
			setDirectoryColor(newColor)
			changeColor(newColor)
		},
		[changeColor]
	)

	const publicLink = useCallback(() => {
		eventEmitter.emit("openPublicLinkDialog", item)
	}, [item])

	const versions = useCallback(() => {
		eventEmitter.emit("openFileVersionsDialog", item)
	}, [item])

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
						onClick={publicLink}
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
							onClick={versions}
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
						{item.type === "directory" && (
							<ContextMenuSub>
								<ContextMenuSubTrigger
									className="cursor-pointer"
									onClick={e => e.stopPropagation()}
								>
									{t("contextMenus.item.color")}
								</ContextMenuSubTrigger>
								<ContextMenuSubContent onClick={e => e.stopPropagation()}>
									<HexColorPicker
										color={directoryColor}
										onChange={onColorPickerChange}
										onClick={e => e.stopPropagation()}
									/>
								</ContextMenuSubContent>
							</ContextMenuSub>
						)}
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
				{!driveURLState.sharedIn && !driveURLState.trash && !driveURLState.sharedOut && (
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
									parent={baseFolderUUID}
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
