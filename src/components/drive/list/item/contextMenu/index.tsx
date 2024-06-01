import { memo, useMemo, useCallback, useState, useEffect } from "react"
import {
	ContextMenu as CM,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent
} from "@/components/ui/context-menu"
import { type DriveCloudItem } from "../../.."
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { useTranslation } from "react-i18next"
import MoveTree from "./moveTree"
import useSDKConfig from "@/hooks/useSDKConfig"
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
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showInputDialog } from "@/components/dialogs/input"
import {
	Eye,
	Download,
	Link,
	PhoneOutgoing,
	History,
	Heart,
	Edit,
	Move,
	Trash,
	Navigation,
	PaintBucket,
	RotateCcw,
	Delete,
	Copy
} from "lucide-react"
import useSuccessToast from "@/hooks/useSuccessToast"
import { selectContacts } from "@/components/dialogs/selectContacts"

const iconSize = 16

export const ContextMenu = memo(
	({ item, children, items }: { item: DriveCloudItem; children: React.ReactNode; items: DriveCloudItem[] }) => {
		const { setItems } = useDriveItemsStore()
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
		const { setVirtualURL } = useDirectoryPublicLinkStore()
		const successToast = useSuccessToast()

		const isInsidePublicLink = useMemo(() => {
			return location.includes("/f/") || location.includes("/d/")
		}, [location])

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

				if (isInsidePublicLink) {
					setVirtualURL(prev => `${prev}/${item.uuid}`)
				} else {
					navigate({
						to: "/drive/$",
						params: {
							_splat: `${location.split("/drive/").join("")}/${item.uuid}`
						}
					})
				}

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
			setCurrentReceivers,
			isInsidePublicLink,
			setVirtualURL
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

			const parentItem = parent.items[0]

			if (!parentItem) {
				return
			}

			const toast = loadingToast()

			try {
				const itemsToMove = selectedItems.filter(item => item.parent !== parentItem.uuid)
				const movedUUIDs = itemsToMove.map(item => item.uuid)

				await actions.move({ selectedItems: itemsToMove, parent: parentItem.uuid })

				setItems(prev => prev.filter(prevItem => !movedUUIDs.includes(prevItem.uuid)))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

			if (
				!(await showConfirmDialog({
					title:
						selectedItems.length >= 2
							? t("contextMenus.item.dialogs.trashMultiple.title")
							: t("contextMenus.item.dialogs.trash.title"),
					continueButtonText:
						selectedItems.length >= 2
							? t("contextMenus.item.dialogs.trashMultiple.continue")
							: t("contextMenus.item.dialogs.trash.continue"),
					description:
						selectedItems.length >= 2
							? t("contextMenus.item.dialogs.trashMultiple.description", { count: selectedItems.length })
							: t("contextMenus.item.dialogs.trash.description", { name: item.name }),
					continueButtonVariant: "destructive"
				}))
			) {
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [selectedItems, setItems, loadingToast, errorToast, t, item.name])

		const deletePermanently = useCallback(async () => {
			if (selectedItems.length === 0) {
				return
			}

			if (
				!(await showConfirmDialog({
					title:
						selectedItems.length >= 2
							? t("contextMenus.item.dialogs.deletePermanentlyMultiple.title")
							: t("contextMenus.item.dialogs.deletePermanently.title"),
					continueButtonText:
						selectedItems.length >= 2
							? t("contextMenus.item.dialogs.deletePermanentlyMultiple.continue")
							: t("contextMenus.item.dialogs.deletePermanently.continue"),
					description:
						selectedItems.length >= 2
							? t("contextMenus.item.dialogs.deletePermanentlyMultiple.description", { count: selectedItems.length })
							: t("contextMenus.item.dialogs.deletePermanently.description", { name: item.name }),
					continueButtonVariant: "destructive"
				}))
			) {
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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [selectedItems, setItems, loadingToast, errorToast, t, item.name])

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

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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
			const item = selectedItems[0]

			if (!item) {
				return
			}

			const inputResponse = await showInputDialog({
				title: t("drive.dialogs.rename.title"),
				continueButtonText: t("drive.dialogs.rename.continue"),
				value: item.name,
				autoFocusInput: true,
				placeholder: t("drive.dialogs.rename.placeholder"),
				continueButtonVariant: "default"
			})

			if (inputResponse.cancelled || inputResponse.value.toLowerCase() === item.name.toLowerCase()) {
				return item.name
			}

			const toast = loadingToast()

			try {
				const newName = await actions.rename({
					item,
					newName: inputResponse.value.trim()
				})

				setItems(prev => prev.map(prevItem => (prevItem.uuid === item.uuid ? { ...prevItem, name: newName } : prevItem)))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [selectedItems, setItems, loadingToast, errorToast, t])

		const toggleFavorite = useCallback(
			async (favorite: boolean) => {
				if (selectedItems.length === 0) {
					return
				}

				const toast = loadingToast()

				try {
					const uuids = selectedItems.map(item => item.uuid)

					await actions.favorite({
						selectedItems,
						favorite
					})

					if (location.includes("favorites") && !favorite) {
						setItems(prev => prev.filter(prevItem => !uuids.includes(prevItem.uuid)))
					} else {
						setItems(prev =>
							prev.map(prevItem => (uuids.includes(prevItem.uuid) ? { ...prevItem, favorited: favorite } : prevItem))
						)
					}
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

			const contacts = await selectContacts()

			if (contacts.cancelled) {
				return
			}

			const toast = loadingToast()

			try {
				await Promise.all(
					contacts.contacts.map(contact =>
						actions.share({
							selectedItems,
							receiverEmail: contact.email
						})
					)
				)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [selectedItems, loadingToast, errorToast])

		const changeColor = useDebouncedCallback(async (color: string) => {
			if (selectedItems.length !== 1 || !selectedItems[0]) {
				return
			}

			const toast = loadingToast()

			try {
				await actions.changeColor({ uuid: selectedItems[0].uuid, color })

				setItems(prev =>
					prev.map(prevItem => (selectedItems[0] && prevItem.uuid === selectedItems[0].uuid ? { ...prevItem, color } : prevItem))
				)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
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

		const copyId = useCallback(async () => {
			try {
				await navigator.clipboard.writeText(item.uuid)

				successToast(t("copiedToClipboard"))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		}, [item.uuid, successToast, errorToast, t])

		const keyDownListener = useCallback(
			(e: KeyboardEvent) => {
				if (e.key === "s" && (e.ctrlKey || e.metaKey) && selectedItems.length > 0) {
					e.preventDefault()
					e.stopPropagation()

					download()

					return
				}

				if (e.key === "Delete" && selectedItems.length > 0) {
					e.preventDefault()
					e.stopPropagation()

					trash()

					return
				}
			},
			[selectedItems, trash, download]
		)

		useEffect(() => {
			window.addEventListener("keydown", keyDownListener)

			return () => {
				window.removeEventListener("keydown", keyDownListener)
			}
		}, [keyDownListener])

		return (
			<CM>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					{selectedItems.length === 1 && item.type === "file" && previewType !== "other" && (
						<ContextMenuItem
							onClick={preview}
							className="cursor-pointer gap-3"
						>
							<Eye size={iconSize} />
							{t("contextMenus.item.preview")}
						</ContextMenuItem>
					)}
					{selectedItems.length === 1 && item.type === "directory" && (
						<>
							<ContextMenuItem
								onClick={openDirectory}
								className="cursor-pointer gap-3"
							>
								<Navigation size={iconSize} />
								{t("contextMenus.item.open")}
							</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					<ContextMenuItem
						onClick={download}
						className="cursor-pointer gap-3"
					>
						<Download size={iconSize} />
						{t("contextMenus.item.download")}
					</ContextMenuItem>
					{!isInsidePublicLink && !driveURLState.sharedIn && <ContextMenuSeparator />}
					{selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && !isInsidePublicLink && (
						<ContextMenuItem
							onClick={publicLink}
							className="cursor-pointer gap-3"
						>
							<Link size={iconSize} />
							{t("contextMenus.item.publicLink")}
						</ContextMenuItem>
					)}
					{!driveURLState.sharedIn && !driveURLState.trash && !isInsidePublicLink && (
						<>
							<ContextMenuItem
								onClick={share}
								className="cursor-pointer gap-3"
							>
								<PhoneOutgoing size={iconSize} />
								{t("contextMenus.item.share")}
							</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					{item.type === "file" &&
						selectedItems.length === 1 &&
						!driveURLState.sharedIn &&
						!driveURLState.trash &&
						!isInsidePublicLink && (
							<>
								<ContextMenuItem
									onClick={versions}
									className="cursor-pointer gap-3"
								>
									<History size={iconSize} />
									{t("contextMenus.item.versions")}
								</ContextMenuItem>
								<ContextMenuSeparator />
							</>
						)}
					{!driveURLState.sharedIn && !driveURLState.trash && !isInsidePublicLink && (
						<>
							<ContextMenuItem
								onClick={() => toggleFavorite(!item.favorited)}
								className="cursor-pointer gap-3"
							>
								<Heart size={iconSize} />
								{item.favorited ? t("contextMenus.item.unfavorite") : t("contextMenus.item.favorite")}
							</ContextMenuItem>
							{item.type === "directory" && (
								<ContextMenuSub>
									<ContextMenuSubTrigger
										className="cursor-pointer gap-3"
										onClick={e => e.stopPropagation()}
									>
										<PaintBucket size={iconSize} />
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
					{selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && !isInsidePublicLink && (
						<ContextMenuItem
							onClick={rename}
							className="cursor-pointer gap-3"
						>
							<Edit size={iconSize} />
							{t("contextMenus.item.rename")}
						</ContextMenuItem>
					)}
					{!driveURLState.sharedIn && !driveURLState.trash && !driveURLState.sharedOut && !isInsidePublicLink && (
						<>
							<ContextMenuSub>
								<ContextMenuSubTrigger
									className="cursor-pointer gap-3"
									onClick={e => e.stopPropagation()}
								>
									<Move size={iconSize} />
									{t("contextMenus.item.move")}
								</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									<ContextMenuItem
										onClick={move}
										className="cursor-pointer gap-3"
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
					{(driveURLState.sharedIn || isInsidePublicLink) && <ContextMenuSeparator />}
					<ContextMenuItem
						onClick={copyId}
						className="cursor-pointer gap-3"
					>
						<Copy size={iconSize} />
						{t("contextMenus.chats.copyId")}
					</ContextMenuItem>
					{!driveURLState.sharedIn && !isInsidePublicLink && <ContextMenuSeparator />}
					{driveURLState.trash && !isInsidePublicLink && (
						<>
							<ContextMenuItem
								onClick={restore}
								className="cursor-pointer gap-3"
							>
								<RotateCcw size={iconSize} />
								{t("contextMenus.item.restore")}
							</ContextMenuItem>
						</>
					)}
					{!driveURLState.sharedIn && !driveURLState.trash && !isInsidePublicLink && (
						<ContextMenuItem
							onClick={trash}
							className="cursor-pointer text-red-500 gap-3"
						>
							<Trash size={iconSize} />
							{t("contextMenus.item.trash")}
						</ContextMenuItem>
					)}
					{driveURLState.trash && !isInsidePublicLink && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={deletePermanently}
								className="cursor-pointer text-red-500 gap-3"
							>
								<Delete size={iconSize} />
								{t("contextMenus.item.deletePermanently")}
							</ContextMenuItem>
						</>
					)}
				</ContextMenuContent>
			</CM>
		)
	}
)

export default ContextMenu
