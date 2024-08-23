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
import useLoadingToast, { LoadingToastContent } from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useDirectoryPublicLinkStore, usePublicLinkStore } from "@/stores/publicLink.store"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showInputDialog } from "@/components/dialogs/input"
import {
	Eye,
	Download,
	Link,
	FolderOutput,
	History,
	Heart,
	Edit,
	Move,
	Trash,
	Navigation,
	PaintBucket,
	RotateCcw,
	Delete,
	Copy,
	Info
} from "lucide-react"
import useSuccessToast from "@/hooks/useSuccessToast"
import { selectContacts } from "@/components/dialogs/selectContacts"
import { MAX_PREVIEW_SIZE } from "@/constants"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { isValidFileName } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { type WorkerToMainMessage } from "@/lib/worker/types"

const iconSize = 16

export const ContextMenu = memo(
	({ item, children, items }: { item: DriveCloudItem; children: React.ReactNode; items: DriveCloudItem[] }) => {
		const setDriveItems = useDriveItemsStore(useCallback(state => state.setItems, []))
		const { t } = useTranslation()
		const { baseFolderUUID } = useSDKConfig()
		const driveURLState = useDriveURLState()
		const navigate = useNavigate()
		const { setCurrentReceiverId, setCurrentSharerId, setCurrentReceiverEmail, setCurrentReceivers, setCurrentSharerEmail } =
			useDriveSharedStore(
				useCallback(
					state => ({
						setCurrentReceiverId: state.setCurrentReceiverId,
						setCurrentSharerId: state.setCurrentSharerId,
						setCurrentReceiverEmail: state.setCurrentReceiverEmail,
						setCurrentReceivers: state.setCurrentReceivers,
						setCurrentSharerEmail: state.setCurrentSharerEmail
					}),
					[]
				)
			)
		const location = useLocation()
		const [directoryColor, setDirectoryColor] = useState<string>(directoryColorToHex(item.type === "directory" ? item.color : null))
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const { setPublicLinkItems, setVirtualURL } = useDirectoryPublicLinkStore(
			useCallback(
				state => ({
					setPublicLinkItems: state.setItems,
					setVirtualURL: state.setVirtualURL
				}),
				[]
			)
		)
		const { passwordState: publicLinkPaswordState } = usePublicLinkStore()
		const successToast = useSuccessToast()
		const publicLinkURLState = usePublicLinkURLState()

		const isInsidePublicLink = useMemo(() => {
			return location.includes("/f/") || location.includes("/d/")
		}, [location])

		const setItems = useMemo(() => {
			return isInsidePublicLink ? setPublicLinkItems : setDriveItems
		}, [isInsidePublicLink, setPublicLinkItems, setDriveItems])

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

				if (driveURLState.publicLink) {
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
			driveURLState.publicLink,
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

				await actions.move({
					selectedItems: itemsToMove,
					parent: parentItem.uuid
				})

				setItems(prev => prev.filter(prevItem => !movedUUIDs.includes(prevItem.uuid)))

				for (const selectedItem of selectedItems) {
					if (selectedItem.type === "directory") {
						eventEmitter.emit("refetchDriveSideBarTree", selectedItem.parent)
					}
				}

				eventEmitter.emit("refetchDriveSideBarTree", parentItem.uuid)
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
				await actions.download({
					selectedItems,
					type: location.includes("shared-in") ? "shared" : publicLinkURLState.isPublicLink ? "linked" : "normal",
					linkHasPassword: publicLinkPaswordState.password.length > 0 && publicLinkPaswordState.salt.length > 0,
					linkPassword:
						publicLinkPaswordState.password.length > 0 && publicLinkPaswordState.salt.length > 0
							? publicLinkPaswordState.password
							: undefined,
					linkUUID: publicLinkURLState.uuid,
					linkSalt: publicLinkPaswordState.salt.length > 0 ? publicLinkPaswordState.salt : undefined
				})
			} catch (e) {
				if (e instanceof Error && !e.message.toLowerCase().includes("abort")) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			}
		}, [
			selectedItems,
			location,
			publicLinkURLState.isPublicLink,
			publicLinkPaswordState.password,
			publicLinkURLState.uuid,
			publicLinkPaswordState.salt,
			errorToast
		])

		const trash = useCallback(async () => {
			if (selectedItems.length === 0 || driveURLState.sharedIn || driveURLState.publicLink) {
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
							: t("contextMenus.item.dialogs.trash.description", {
									name: selectedItems[0] ? selectedItems[0].name : ""
								}),
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

				for (const selectedItem of selectedItems) {
					if (selectedItem.type === "directory") {
						eventEmitter.emit("refetchDriveSideBarTree", selectedItem.parent)
					}
				}
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [selectedItems, setItems, loadingToast, errorToast, t, driveURLState.sharedIn, driveURLState.publicLink])

		const deletePermanently = useCallback(async () => {
			if (selectedItems.length === 0 || !driveURLState.trash || driveURLState.publicLink) {
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

				for (const selectedItem of selectedItems) {
					if (selectedItem.type === "directory") {
						eventEmitter.emit("refetchDriveSideBarTree", selectedItem.parent)
					}
				}
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		}, [selectedItems, setItems, loadingToast, errorToast, t, item.name, driveURLState.trash, driveURLState.publicLink])

		const restore = useCallback(async () => {
			if (selectedItems.length === 0) {
				return
			}

			const toast = loadingToast()

			try {
				const restoredUUIDs = selectedItems.map(item => item.uuid)

				await actions.restore({ selectedItems })

				setItems(prev => prev.filter(prevItem => !restoredUUIDs.includes(prevItem.uuid)))

				for (const selectedItem of selectedItems) {
					if (selectedItem.type === "directory") {
						eventEmitter.emit("refetchDriveSideBarTree", selectedItem.parent)
					}
				}
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
				return
			}

			if (!isValidFileName(inputResponse.value)) {
				errorToast(
					item.type === "directory" ? t("drive.dialogs.rename.invalidDirectoryName") : t("drive.dialogs.rename.invalidFileName")
				)

				return
			}

			const toast = loadingToast()

			try {
				const newName = await actions.rename({
					item,
					newName: inputResponse.value.trim()
				})

				setItems(prev => prev.map(prevItem => (prevItem.uuid === item.uuid ? { ...prevItem, name: newName } : prevItem)))

				if (item.type === "directory") {
					eventEmitter.emit("refetchDriveSideBarTree", item.parent)
				}
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

			const contacts = await selectContacts({
				excludeUserIds: selectedItems.map(item => item.receivers.map(receiver => receiver.id)).flat(99999999999)
			})

			if (contacts.cancelled) {
				return
			}

			const toast = loadingToast()
			const requestUUID = uuidv4()

			const workerMessageListener = eventEmitter.on("workerMessage", (message: WorkerToMainMessage) => {
				if (message.type === "shareProgress" && message.requestUUID === requestUUID) {
					toast.update({
						description: <LoadingToastContent text={t("contextMenus.item.shareProgress", { done: message.done })} />,
						variant: "default",
						duration: Infinity,
						id: toast.id
					})
				}
			})

			try {
				await Promise.all(
					contacts.contacts.map(contact =>
						actions.share({
							selectedItems,
							receiverEmail: contact.email,
							requestUUID
						})
					)
				)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()

				workerMessageListener.remove()
			}
		}, [selectedItems, loadingToast, errorToast, t])

		const changeColor = useDebouncedCallback(async (color: string) => {
			if (selectedItems.length !== 1 || !selectedItems[0]) {
				return
			}

			const toast = loadingToast()

			try {
				await actions.changeColor({
					uuid: selectedItems[0].uuid,
					color
				})

				eventEmitter.emit("refetchDriveSideBarTree", selectedItems[0].parent)

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

					if (driveURLState.trash && !driveURLState.publicLink) {
						deletePermanently()
					} else {
						trash()
					}

					return
				}
			},
			[selectedItems, trash, download, driveURLState.publicLink, driveURLState.trash, deletePermanently]
		)

		const onOpenChange = useCallback(
			(isOpen: boolean) => {
				if (isOpen) {
					setItems(prev => {
						const selected = prev.filter(item => item.selected).length

						return prev.map(prevItem =>
							prevItem.uuid === item.uuid
								? {
										...prevItem,
										selected: true
									}
								: {
										...prevItem,
										selected: selected > 1 ? prevItem.selected : false
									}
						)
					})
				} else {
					setItems(prev => prev.map(prevItem => ({ ...prevItem, selected: false })))
				}
			},
			[setItems, item.uuid]
		)

		const info = useCallback(() => {
			eventEmitter.emit("openInfoDialog", item)
		}, [item])

		useEffect(() => {
			window.addEventListener("keydown", keyDownListener)

			return () => {
				window.removeEventListener("keydown", keyDownListener)
			}
		}, [keyDownListener])

		return (
			<CM onOpenChange={onOpenChange}>
				<ContextMenuTrigger asChild={true}>{children}</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					{selectedItems.length === 1 && item.type === "file" && previewType !== "other" && MAX_PREVIEW_SIZE > item.size && (
						<ContextMenuItem
							onClick={preview}
							className="cursor-pointer gap-3"
						>
							<Eye size={iconSize} />
							{t("contextMenus.item.preview")}
						</ContextMenuItem>
					)}
					{selectedItems.length === 1 && item.type === "directory" && !driveURLState.trash && (
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
					{!driveURLState.publicLink && !driveURLState.sharedIn && !driveURLState.trash && <ContextMenuSeparator />}
					{selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && !driveURLState.publicLink && (
						<ContextMenuItem
							onClick={publicLink}
							className="cursor-pointer gap-3"
						>
							<Link size={iconSize} />
							{t("contextMenus.item.publicLink")}
						</ContextMenuItem>
					)}
					{!driveURLState.sharedIn && !driveURLState.trash && !driveURLState.publicLink && (
						<>
							<ContextMenuItem
								onClick={share}
								className="cursor-pointer gap-3"
							>
								<FolderOutput size={iconSize} />
								{t("contextMenus.item.share")}
							</ContextMenuItem>
							<ContextMenuSeparator />
						</>
					)}
					{item.type === "file" &&
						selectedItems.length === 1 &&
						!driveURLState.sharedIn &&
						!driveURLState.trash &&
						!driveURLState.publicLink && (
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
					{!driveURLState.sharedIn && !driveURLState.trash && !driveURLState.publicLink && (
						<>
							<ContextMenuItem
								onClick={() => toggleFavorite(!item.favorited)}
								className="cursor-pointer gap-3"
							>
								<Heart size={iconSize} />
								{item.favorited ? t("contextMenus.item.unfavorite") : t("contextMenus.item.favorite")}
							</ContextMenuItem>
							<ContextMenuItem
								onClick={info}
								className="cursor-pointer gap-3"
							>
								<Info size={iconSize} />
								{t("contextMenus.item.info")}
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
					{selectedItems.length === 1 && !driveURLState.sharedIn && !driveURLState.trash && !driveURLState.publicLink && (
						<ContextMenuItem
							onClick={rename}
							className="cursor-pointer gap-3"
						>
							<Edit size={iconSize} />
							{t("contextMenus.item.rename")}
						</ContextMenuItem>
					)}
					{!driveURLState.sharedIn &&
						!driveURLState.trash &&
						!driveURLState.sharedOut &&
						!driveURLState.publicLink &&
						!driveURLState.links && (
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
								{selectedItems.length > 1 && <ContextMenuSeparator />}
							</>
						)}
					{selectedItems.length === 1 && !publicLinkURLState.isPublicLink && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={copyId}
								className="cursor-pointer gap-3"
							>
								<Copy size={iconSize} />
								{t("contextMenus.chats.copyId")}
							</ContextMenuItem>
							{!driveURLState.sharedIn && <ContextMenuSeparator />}
						</>
					)}
					{driveURLState.trash && !driveURLState.publicLink && (
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
					{!driveURLState.sharedIn && !driveURLState.trash && !driveURLState.publicLink && (
						<ContextMenuItem
							onClick={trash}
							className="cursor-pointer text-red-500 gap-3"
						>
							<Trash size={iconSize} />
							{t("contextMenus.item.trash")}
						</ContextMenuItem>
					)}
					{driveURLState.trash && !driveURLState.publicLink && (
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
