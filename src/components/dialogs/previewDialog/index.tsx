import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType, ensureTextFileExtension } from "./utils"
import Text from "./text"
import PDF from "./pdf"
import Image from "./image"
import Video from "./video"
import DocX from "./docx"
import { Loader as LoaderIcon, X, Save, ArrowLeft, ArrowRight, Eye } from "lucide-react"
import { showConfirmDialog } from "../confirm"
import { uploadFile } from "@/lib/worker/worker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
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
	const { currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId } = useDriveSharedStore()
	const [previewType, setPreviewType] = useState<string>("")
	const canUpload = useCanUpload()
	const { items } = useDriveItemsStore()
	const publicLinkURLState = usePublicLinkURLState()
	const driveURLState = useDriveURLState()

	const nextAndPreviousItems = useMemo(() => {
		if (!item || didChange || publicLinkURLState.isPublicLink || !open) {
			return {
				nextItem: null,
				previousItem: null,
				nextItemPreviewType: null,
				previousItemPreviewType: null
			}
		}

		const itemIndex = items.findIndex(i => i.uuid === item.uuid)

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

		for (let i = itemIndex; i <= items.length; i++) {
			const nItem = items[i]

			if (nItem && goToPreviewTypes.includes(fileNameToPreviewType(nItem.name)) && i !== itemIndex) {
				nextItem = nItem

				break
			}
		}

		for (let i = itemIndex; i >= 0; i--) {
			const pItem = items[i]

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
	}, [item, items, didChange, publicLinkURLState.isPublicLink, open])

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
		if (publicLinkURLState.isPublicLink) {
			return true
		}

		if (!canUpload && !driveURLState.links && !driveURLState.sharedOut) {
			return true
		}

		if (item && typeof item.parent !== "string") {
			return true
		}

		return false
	}, [canUpload, publicLinkURLState.isPublicLink, driveURLState.links, driveURLState.sharedOut, item])

	const cleanup = useCallback(() => {
		setTimeout(() => {
			if (!openRef.current) {
				for (const uuid in urlObjects) {
					const object = urlObjects[uuid]

					if (object) {
						globalThis.URL.revokeObjectURL(object)
					}
				}

				setURLObjects({})
				setBuffers({})
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

	const loadFile = useCallback(
		async ({ itm }: { itm: DriveCloudItem }) => {
			if (itm.type !== "file") {
				return
			}

			const previewType = fileNameToPreviewType(itm.name)

			if (previewType === "other" || itm.size >= 256 * 1024 * 1024) {
				return
			}

			try {
				const buffer = await readFileAndSanitize({ item: itm, emitEvents: false })

				if (previewType === "text" || previewType === "docx" || previewType === "md" || previewType === "code") {
					setBuffers(prev => ({ ...prev, [itm.uuid]: buffer }))
				} else {
					setURLObjects(prev => ({ ...prev, [itm.uuid]: globalThis.URL.createObjectURL(new Blob([buffer], { type: itm.mime })) }))
				}
			} catch (e) {
				console.error(e)
			} finally {
				cleanup()
			}
		},
		[cleanup]
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

			setBuffers(prev => ({ ...prev, [itm.uuid]: buffer }))
			setItem(itm)
			setDidChange(false)
		} catch (e) {
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
			value: "",
			autoFocusInput: true,
			placeholder: t("drive.dialogs.createTextFile.placeholder")
		})

		if (inputResponse.cancelled) {
			return
		}

		const fileName = ensureTextFileExtension(inputResponse.value.trim())

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
		setBuffers(prev => ({ ...prev, [newTextFileItem.uuid]: Buffer.from("", "utf8") }))
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
		t
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
						<div className="flex flex-row border-b h-[49px] bg-secondary w-full items-center justify-between px-4 z-50 gap-10 -mt-[1px]">
							<div className="flex flex-row items-center gap-2 grow">
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
														<Save
															onClick={saveFile}
															size={20}
															className="cursor-pointer"
														/>
													</TooltipTrigger>
													<TooltipContent side="left">
														<p>{t("dialogs.previewDialog.save")}</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
									</>
								)}
								{readOnly && (
									<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
										<Tooltip>
											<TooltipTrigger asChild={true}>
												<Eye size={20} />
											</TooltipTrigger>
											<TooltipContent side="left">
												<p>{t("dialogs.previewDialog.readOnly")}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
								<p className="line-clamp-1 text-ellipsis break-all">{item.name}</p>
							</div>
							<X
								className="h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer"
								onClick={() => onOpenChange(false)}
							/>
						</div>
						{goToPreviewTypes.includes(previewType) && !publicLinkURLState.isPublicLink && (
							<>
								{canGoToPreviousItem && (
									<div
										className="w-[40px] h-[40px] absolute flex flex-row items-center justify-center z-50 top-[50%] rounded-full bg-secondary cursor-pointer left-4 opacity-75 text-primary"
										onClick={goToPreviousItem}
									>
										<ArrowLeft />
									</div>
								)}
								{canGoToNextItem && (
									<div
										className="w-[40px] h-[40px] absolute flex flex-row items-center justify-center z-50 top-[50%] rounded-full bg-secondary cursor-pointer right-4 opacity-75 text-primary"
										onClick={goToNextItem}
									>
										<ArrowRight />
									</div>
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
						{previewType === "pdf" && <>{urlObjects[item.uuid] ? <PDF urlObject={urlObjects[item.uuid]!} /> : <Loader />}</>}
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
				)}
			</DialogContent>
		</Dialog>
	)
})

export default PreviewDialog
