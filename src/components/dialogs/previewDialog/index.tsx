import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { type DriveCloudItem } from "@/components/drive"
import worker from "@/lib/worker"
import { fileNameToPreviewType } from "./utils"
import Text from "./text"
import PDF from "./pdf"
import Image from "./image"
import Video from "./video"
import DocX from "./docx"
import { Loader as LoaderIcon, X, Save } from "lucide-react"
import { showConfirmDialog } from "../confirm"
import { uploadFile } from "@/lib/worker/worker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { useTranslation } from "react-i18next"
import { v4 as uuidv4 } from "uuid"
import { showInputDialog } from "../input"
import useRouteParent from "@/hooks/useRouteParent"
import { useDriveSharedStore } from "@/stores/drive.store"
import useCanUpload from "@/hooks/useCanUpload"
import useLocation from "@/hooks/useLocation"
import Audio from "./audio"

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
	const location = useLocation()

	const isInsidePublicLink = useMemo(() => {
		return location.includes("/f/") || location.includes("/d/")
	}, [location])

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
						title: "d",
						continueButtonText: "ddd",
						description: "ookeoetrasher",
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			setOpen(openState)
			cleanup()
		},
		[cleanup, didChange, saving]
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
				const buffer = await worker.readFile({ item: itm, emitEvents: false })

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
			if (!canUpload || isInsidePublicLink) {
				return
			}

			textRef.current = value

			setDidChange(true)
		},
		[canUpload, isInsidePublicLink]
	)

	const keyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (!open) {
				return
			}

			if (e.key === "s" && (e.ctrlKey || e.metaKey) && didChange && canUpload && !isInsidePublicLink) {
				e.preventDefault()
				e.stopPropagation()

				saveFile()
			}
		},
		[open, saveFile, didChange, canUpload, isInsidePublicLink]
	)

	const createTextFile = useCallback(async () => {
		if (saving || didChange || !canUpload || isInsidePublicLink) {
			return
		}

		const inputResponse = await showInputDialog({
			title: "newfolder",
			continueButtonText: "create",
			value: "",
			autoFocusInput: true,
			placeholder: "New folder"
		})

		if (inputResponse.cancelled) {
			return
		}

		const newTextFileItem: DriveCloudItem = {
			name: inputResponse.value.trim(),
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
		canUpload,
		isInsidePublicLink
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
					<div className="absolute w-screen h-screen flex flex-col">
						<div className="flex flex-row border-b h-[49px] shadow-md bg-secondary w-full items-center justify-between px-4 z-50 gap-10 -mt-[1px]">
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
								<p className="line-clamp-1 text-ellipsis break-all">{item.name}</p>
							</div>
							<X
								className="h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer"
								onClick={() => onOpenChange(false)}
							/>
						</div>
						{(previewType === "text" || previewType === "code" || previewType === "md") && (
							<>
								{buffers[item.uuid] ? (
									<Text
										buffer={buffers[item.uuid]!}
										item={item}
										onValueChange={onValueChange}
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
