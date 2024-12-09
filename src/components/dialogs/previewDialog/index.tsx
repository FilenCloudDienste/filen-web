import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType, ensureTextFileExtension, isFileStreamable } from "./utils"
import Text from "./text"
import PDF from "./pdf"
import Image from "./image"
import Video from "./video"
import DocX from "./docx"
import { Loader as LoaderIcon, X, Save, ArrowLeft, ArrowRight, Eye } from "lucide-react"
import { showConfirmDialog } from "../confirm"
import { uploadFile } from "@/lib/worker/worker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
	TOOLTIP_POPUP_DELAY,
	IS_APPLE_DEVICE,
	IS_DESKTOP,
	MAX_PREVIEW_SIZE_SW,
	MAX_PREVIEW_SIZE_WEB,
	DESKTOP_HTTP_SERVER_PORT
} from "@/constants"
import { useTranslation } from "react-i18next"
import { v4 as uuidv4 } from "uuid"
import { showInputDialog } from "../input"
import useRouteParent from "@/hooks/useRouteParent"
import { useDriveSharedStore, useDriveItemsStore } from "@/stores/drive.store"
import useCanUpload from "@/hooks/useCanUpload"
import Audio from "./audio"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import useDriveURLState from "@/hooks/useDriveURLState"
import { readFileAndSanitize } from "@/lib/worker/proxy"
import { useLocalStorage } from "@uidotdev/usehooks"
import { type DriveSortBy } from "@/components/drive/list/header"
import { orderItemsByType } from "@/components/drive/utils"
import useLocation from "@/hooks/useLocation"
import { cn, isValidFileName } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import useErrorToast from "@/hooks/useErrorToast"
import useIsServiceWorkerOnline from "@/hooks/useIsServiceWorkerOnline"
import useIsDesktopHTTPServerOnline from "@/hooks/useIsDesktopHTTPServerOnline"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"

const goToPreviewTypes = ["audio", "docx", "image", "pdf"]

export const Loader = memo(() => {
	return (
		<div className="flex flex-col items-center justify-center w-full h-full">
			<LoaderIcon className="animate-spin-medium" />
		</div>
	)
})

export const PreviewDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [item, setItem] = useState<DriveCloudItem | null>(null)
	const [urlObjects, setURLObjects] = useState<Record<string, string>>({})
	const [buffers, setBuffers] = useState<Record<string, Buffer>>({})
	const openRef = useRef<boolean>(false)
	const [didChange, setDidChange] = useState<boolean>(false)
	const textRef = useRef<string>("")
	const [saving, setSaving] = useState<boolean>(false)
	const { t } = useTranslation()
	const routeParent = useRouteParent()
	const { currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId } = useDriveSharedStore(
		useCallback(
			state => ({
				currentReceiverEmail: state.currentReceiverEmail,
				currentReceiverId: state.currentReceiverId,
				currentReceivers: state.currentReceivers,
				currentSharerEmail: state.currentSharerEmail,
				currentSharerId: state.currentSharerId
			}),
			[]
		)
	)
	const [previewType, setPreviewType] = useState<string>("")
	const canUpload = useCanUpload()
	const { driveItems, driveSearchTerm } = useDriveItemsStore(
		useCallback(
			state => ({
				driveItems: state.items,
				driveSearchTerm: state.searchTerm
			}),
			[]
		)
	)
	const { publicLinkItems, publicLinkSearchTerm } = useDirectoryPublicLinkStore(
		useCallback(
			state => ({
				publicLinkItems: state.items,
				publicLinkSearchTerm: state.searchTerm
			}),
			[]
		)
	)
	const publicLinkURLState = usePublicLinkURLState()
	const driveURLState = useDriveURLState()
	const [driveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})
	const location = useLocation()
	const errorToast = useErrorToast()
	const isServiceWorkerOnline = useIsServiceWorkerOnline()
	const isDesktopHTTPServerOnline = useIsDesktopHTTPServerOnline()

	const { items, searchTerm } = useMemo(() => {
		if (publicLinkURLState.isPublicLink && location.includes("/f/")) {
			return {
				items: publicLinkItems,
				searchTerm: publicLinkSearchTerm
			}
		}

		return {
			items: driveItems,
			searchTerm: driveSearchTerm
		}
	}, [publicLinkURLState.isPublicLink, driveItems, publicLinkItems, driveSearchTerm, publicLinkSearchTerm, location])

	const itemsOrdered = useMemo(() => {
		if (!open) {
			return items
		}

		if (location.includes("recents")) {
			return orderItemsByType({
				items,
				type: "uploadDateDesc"
			})
		}

		const sortBy = driveSortBy[routeParent]

		return orderItemsByType({
			items,
			type: sortBy ? sortBy : "nameAsc"
		})
	}, [items, location, driveSortBy, routeParent, open])

	const itemsFiltered = useMemo(() => {
		if (searchTerm.length === 0 || !open) {
			return itemsOrdered
		}

		const searchTermLowered = searchTerm.trim().toLowerCase()

		return itemsOrdered.filter(item => item.name.toLowerCase().includes(searchTermLowered))
	}, [itemsOrdered, searchTerm, open])

	const nextAndPreviousItems = useMemo(() => {
		if (!item || didChange || (publicLinkURLState.isPublicLink && location.includes("/d/")) || !open) {
			return {
				nextItem: null,
				previousItem: null,
				nextItemPreviewType: null,
				previousItemPreviewType: null
			}
		}

		const itemIndex = itemsFiltered.findIndex(i => i.uuid === item.uuid)

		if (itemIndex === -1) {
			return {
				nextItem: null,
				previousItem: null,
				nextItemPreviewType: null,
				previousItemPreviewType: null
			}
		}

		let nextItem: DriveCloudItem | null = null
		let previousItem: DriveCloudItem | null = null

		for (let i = itemIndex; i <= itemsFiltered.length; i++) {
			const nItem = itemsFiltered[i]

			if (nItem && goToPreviewTypes.includes(fileNameToPreviewType(nItem.name)) && i !== itemIndex) {
				nextItem = nItem

				break
			}
		}

		for (let i = itemIndex; i >= 0; i--) {
			const pItem = itemsFiltered[i]

			if (pItem && goToPreviewTypes.includes(fileNameToPreviewType(pItem.name)) && i !== itemIndex) {
				previousItem = pItem

				break
			}
		}

		return {
			nextItem,
			previousItem,
			nextItemPreviewType: nextItem ? fileNameToPreviewType(nextItem.name) : null,
			previousItemPreviewType: previousItem ? fileNameToPreviewType(previousItem.name) : null
		}
	}, [item, itemsFiltered, didChange, publicLinkURLState.isPublicLink, open, location])

	const canGoToPreviousItem = useMemo(() => {
		return (
			nextAndPreviousItems.previousItem &&
			!didChange &&
			nextAndPreviousItems.previousItemPreviewType &&
			goToPreviewTypes.includes(nextAndPreviousItems.previousItemPreviewType) &&
			open &&
			goToPreviewTypes.includes(previewType)
		)
	}, [nextAndPreviousItems, didChange, open, previewType])

	const canGoToNextItem = useMemo(() => {
		return (
			nextAndPreviousItems.nextItem &&
			!didChange &&
			nextAndPreviousItems.nextItemPreviewType &&
			goToPreviewTypes.includes(nextAndPreviousItems.nextItemPreviewType) &&
			open &&
			goToPreviewTypes.includes(previewType)
		)
	}, [nextAndPreviousItems, didChange, open, previewType])

	const goToPreviousItem = useCallback(() => {
		if (!canGoToPreviousItem || !nextAndPreviousItems.previousItem) {
			return
		}

		eventEmitter.emit("openPreviewModal", { item: nextAndPreviousItems.previousItem })
	}, [nextAndPreviousItems, canGoToPreviousItem])

	const goToNextItem = useCallback(() => {
		if (!canGoToNextItem || !nextAndPreviousItems.nextItem) {
			return
		}

		eventEmitter.emit("openPreviewModal", { item: nextAndPreviousItems.nextItem })
	}, [nextAndPreviousItems, canGoToNextItem])

	const readOnly = useMemo(() => {
		if (
			publicLinkURLState.isPublicLink ||
			(!canUpload && !driveURLState.links && !driveURLState.sharedOut) ||
			(item && typeof item.parent !== "string") ||
			["docx", "image", "video", "audio", "pdf"].includes(previewType)
		) {
			return true
		}

		return false
	}, [canUpload, publicLinkURLState.isPublicLink, driveURLState.links, driveURLState.sharedOut, item, previewType])

	const cleanup = useCallback(() => {
		setTimeout(() => {
			if (!openRef.current) {
				for (const uuid in urlObjects) {
					const object = urlObjects[uuid]

					if (object && !object.startsWith("http://localhost")) {
						globalThis.URL.revokeObjectURL(object)
					}
				}

				setURLObjects({})
				setBuffers({})
				setItem(null)
			}
		}, 3000)
	}, [urlObjects])

	const onOpenChange = useCallback(
		async (openState: boolean) => {
			if (saving) {
				return
			}

			if (didChange) {
				if (
					!(await showConfirmDialog({
						title: t("previewDialog.unsavedChanges.title"),
						continueButtonText: t("previewDialog.unsavedChanges.continue"),
						description: t("previewDialog.unsavedChanges.description"),
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			setOpen(openState)
			cleanup()
		},
		[cleanup, didChange, saving, t]
	)

	const close = useCallback(() => {
		onOpenChange(false)
	}, [onOpenChange])

	const loadFile = useCallback(
		async ({ itm }: { itm: DriveCloudItem }) => {
			if (itm.type !== "file") {
				return
			}

			const previewType = fileNameToPreviewType(itm.name)
			const maxPreviewSize =
				(isServiceWorkerOnline || isDesktopHTTPServerOnline) && itm.type === "file" && isFileStreamable(itm.name, itm.mime)
					? MAX_PREVIEW_SIZE_SW
					: MAX_PREVIEW_SIZE_WEB

			if (previewType === "other" || itm.size >= maxPreviewSize) {
				return
			}

			try {
				if (
					(isServiceWorkerOnline || isDesktopHTTPServerOnline) &&
					(previewType === "audio" || previewType === "video" || previewType === "image") &&
					isFileStreamable(itm.name, itm.mime)
				) {
					const fileBase64 = Buffer.from(
						JSON.stringify({
							name: itm.name,
							mime: itm.mime,
							size: itm.size,
							uuid: itm.uuid,
							bucket: itm.bucket,
							key: itm.key,
							version: itm.version,
							chunks: itm.chunks,
							region: itm.region
						}),
						"utf-8"
					).toString("base64")

					setURLObjects(prev => ({
						...prev,
						[itm.uuid]: isServiceWorkerOnline
							? `${window.location.origin}/sw/stream?file=${encodeURIComponent(fileBase64)}`
							: `http://localhost:${DESKTOP_HTTP_SERVER_PORT}/stream?file=${encodeURIComponent(fileBase64)}`
					}))

					return
				}

				const buffer = await readFileAndSanitize({
					item: itm,
					emitEvents: false
				})

				if (previewType === "text" || previewType === "docx" || previewType === "md" || previewType === "code") {
					setBuffers(prev => ({
						...prev,
						[itm.uuid]: buffer
					}))
				} else {
					setURLObjects(prev => ({
						...prev,
						[itm.uuid]: globalThis.URL.createObjectURL(new Blob([buffer], { type: itm.mime }))
					}))
				}
			} catch (e) {
				console.error(e)
			} finally {
				cleanup()
			}
		},
		[cleanup, isServiceWorkerOnline, isDesktopHTTPServerOnline]
	)

	const saveFile = useCallback(async () => {
		if (!item || item.type !== "file" || !didChange || textRef.current.length === 0 || saving) {
			return
		}

		setSaving(true)

		try {
			const buffer = Buffer.from(textRef.current, "utf-8")
			const itm = await uploadFile({
				file: new File([buffer], item.name, {
					type: item.mime
				}),
				parent: item.parent,
				sharerId: item.sharerId,
				receiverId: item.receiverId,
				receiverEmail: item.receiverEmail,
				receivers: item.receivers,
				sharerEmail: item.sharerEmail,
				name: item.name,
				emitEvents: false
			})

			eventEmitter.emit("refetchDrive")

			setBuffers(prev => ({
				...prev,
				[itm.uuid]: buffer
			}))

			setItem(itm)
			setDidChange(false)
		} catch (e) {
			if (e instanceof Error && e.message.toLowerCase().includes("maximum storage reached")) {
				eventEmitter.emit("openStorageDialog")

				return
			}

			console.error(e)
		} finally {
			setSaving(false)
		}
	}, [didChange, item, saving])

	const onValueChange = useCallback(
		(value: string) => {
			if (readOnly) {
				return
			}

			textRef.current = value

			setDidChange(true)
		},
		[readOnly]
	)

	const keyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (!open) {
				return
			}

			if (e.key === "s" && (e.ctrlKey || e.metaKey) && didChange && !readOnly) {
				e.preventDefault()
				e.stopPropagation()

				saveFile()

				return
			}

			if (e.key === "ArrowLeft" && canGoToPreviousItem) {
				e.preventDefault()
				e.stopPropagation()

				goToPreviousItem()

				return
			}

			if (e.key === "ArrowRight" && canGoToNextItem) {
				e.preventDefault()
				e.stopPropagation()

				goToNextItem()

				return
			}
		},
		[open, saveFile, didChange, readOnly, canGoToPreviousItem, goToPreviousItem, goToNextItem, canGoToNextItem]
	)

	const createTextFile = useCallback(async () => {
		if (saving || didChange || readOnly) {
			return
		}

		const inputResponse = await showInputDialog({
			title: t("drive.dialogs.createTextFile.title"),
			continueButtonText: t("drive.dialogs.createTextFile.continue"),
			value: ".txt",
			autoFocusInput: true,
			placeholder: t("drive.dialogs.createTextFile.placeholder"),
			minLength: 0,
			maxLength: 255
		})

		if (inputResponse.cancelled) {
			return
		}

		const fileName = inputResponse.value.trim().length > 0 ? ensureTextFileExtension(inputResponse.value.trim()) : ".txt"

		if (!isValidFileName(fileName)) {
			errorToast(t("drive.dialogs.createTextFile.invalidFileName"))

			return
		}

		const newTextFileItem: DriveCloudItem = {
			name: fileName,
			uuid: uuidv4(),
			parent: routeParent,
			size: 1,
			selected: false,
			chunks: 1,
			type: "file",
			bucket: "",
			rm: "",
			region: "",
			sharerId: currentSharerId,
			receiverId: currentReceiverId,
			receiverEmail: currentReceiverEmail,
			receivers: currentReceivers,
			sharerEmail: currentSharerEmail,
			favorited: false,
			key: "",
			lastModified: Date.now(),
			timestamp: Date.now(),
			version: 2,
			mime: ""
		}

		textRef.current = ""

		setPreviewType(fileNameToPreviewType(newTextFileItem.name))
		setSaving(false)
		setDidChange(false)
		setItem(newTextFileItem)
		setBuffers(prev => ({
			...prev,
			[newTextFileItem.uuid]: Buffer.from("", "utf8")
		}))
		setOpen(true)
	}, [
		saving,
		didChange,
		routeParent,
		currentReceiverEmail,
		currentReceivers,
		currentReceiverId,
		currentSharerEmail,
		currentSharerId,
		readOnly,
		t,
		errorToast
	])

	useEffect(() => {
		openRef.current = open
	}, [open])

	useEffect(() => {
		window.addEventListener("keydown", keyDownListener)

		return () => {
			window.removeEventListener("keydown", keyDownListener)
		}
	}, [keyDownListener])

	useEffect(() => {
		const listener = eventEmitter.on("openPreviewModal", ({ item: itm }: { item: DriveCloudItem }) => {
			textRef.current = ""

			setPreviewType(fileNameToPreviewType(itm.name))
			setSaving(false)
			setDidChange(false)
			setItem(itm)
			loadFile({ itm })
			setOpen(true)
		})

		const newTextFileListener = eventEmitter.on("createTextFile", () => {
			createTextFile()
		})

		return () => {
			listener.remove()
			newTextFileListener.remove()
		}
	}, [loadFile, createTextFile])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="fullscreen-dialog no-close-button outline-none focus:outline-none active:outline-none hover:outline-none select-none">
				{item && (
					<div className="absolute w-screen h-[100dvh] flex flex-col">
						<div
							className="flex flex-row h-[49px] -mt-[1px] bg-secondary w-full items-center justify-between px-4 z-50 gap-10"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "drag"
							}}
						>
							<div className={cn("flex flex-row items-center gap-2 grow", IS_APPLE_DEVICE && IS_DESKTOP && "pl-16")}>
								{didChange && (
									<>
										{saving ? (
											<LoaderIcon
												size={20}
												className="animate-spin-medium"
											/>
										) : (
											<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
												<Tooltip>
													<TooltipTrigger asChild={true}>
														<Button
															size="sm"
															className="h-7 mr-1"
															onClick={saveFile}
															style={{
																// @ts-expect-error not typed
																WebkitAppRegion: "no-drag"
															}}
														>
															<Save size={18} />
														</Button>
													</TooltipTrigger>
													<TooltipContent side="bottom">
														<p>{t("dialogs.previewDialog.save")}</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
									</>
								)}
								{readOnly && (previewType === "text" || previewType === "code" || previewType === "md") && (
									<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
										<Tooltip>
											<TooltipTrigger asChild={true}>
												<Eye
													size={20}
													style={{
														// @ts-expect-error not typed
														WebkitAppRegion: "no-drag"
													}}
												/>
											</TooltipTrigger>
											<TooltipContent side="bottom">
												<p>{t("dialogs.previewDialog.readOnly")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
								<p className="line-clamp-1 text-ellipsis break-all">{item.name}</p>
							</div>
							<div
								className="flex flex-row items-center justify-end h-12 w-12 opacity-70 hover:opacity-100 cursor-pointer"
								onClick={close}
								style={{
									// @ts-expect-error not typed
									WebkitAppRegion: "no-drag"
								}}
							>
								<X size={18} />
							</div>
						</div>
						<div
							className="flex flex-col w-full h-[calc(100dvh-48px)]"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
						>
							{goToPreviewTypes.includes(previewType) && !(publicLinkURLState.isPublicLink && location.includes("/d/")) && (
								<>
									{canGoToPreviousItem && (
										<Button
											className="w-[40px] h-[40px] absolute flex flex-row items-center justify-center z-50 top-[50%] rounded-full left-4 opacity-75 text-primary"
											onClick={goToPreviousItem}
											variant="secondary"
											size="icon"
										>
											<ArrowLeft size={18} />
										</Button>
									)}
									{canGoToNextItem && (
										<Button
											className="w-[40px] h-[40px] absolute flex flex-row items-center justify-center z-50 top-[50%] rounded-full right-4 opacity-75 text-primary"
											onClick={goToNextItem}
											variant="secondary"
											size="icon"
										>
											<ArrowRight size={18} />
										</Button>
									)}
								</>
							)}
							{(previewType === "text" || previewType === "code" || previewType === "md") && (
								<>
									{buffers[item.uuid] ? (
										<Text
											buffer={buffers[item.uuid]!}
											item={item}
											onValueChange={onValueChange}
											readOnly={readOnly}
										/>
									) : (
										<Loader />
									)}
								</>
							)}
							{previewType === "docx" && <>{buffers[item.uuid] ? <DocX buffer={buffers[item.uuid]!} /> : <Loader />}</>}
							{previewType === "pdf" && (
								<>{urlObjects[item.uuid] ? <PDF urlObject={urlObjects[item.uuid]!} /> : <Loader />}</>
							)}
							{previewType === "image" && (
								<Image
									urlObject={urlObjects[item.uuid]}
									item={item}
								/>
							)}
							{previewType === "video" && (
								<>{urlObjects[item.uuid] ? <Video urlObject={urlObjects[item.uuid]!} /> : <Loader />}</>
							)}
							{previewType === "audio" && (
								<>{urlObjects[item.uuid] ? <Audio urlObject={urlObjects[item.uuid]!} /> : <Loader />}</>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
})

export default PreviewDialog
