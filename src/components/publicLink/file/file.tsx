import { memo, useMemo, useCallback, useState, useEffect, useRef } from "react"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { useFilePublicLinkInfo, usePublicLinkURLState } from "@/hooks/usePublicLink"
import { Loader, Eye, Download, EyeOff } from "lucide-react"
import { fileNameToPreviewType } from "@/components/dialogs/previewDialog/utils"
import { fileNameToSVGIcon } from "@/assets/fileExtensionIcons"
import { type DriveCloudItem } from "@/components/drive"
import { formatBytes } from "@/utils"
import { Button } from "@/components/ui/button"
import { downloadFile } from "@/lib/worker/proxy"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import worker from "@/lib/worker"
import ImagePreview from "@/components/dialogs/previewDialog/image"
import { cn } from "@/lib/utils"
import { useTheme } from "@/providers/themeProvider"
import TextPreview from "@/components/dialogs/previewDialog/text"
import PDFPreview from "@/components/dialogs/previewDialog/pdf"
import DocXPreview from "@/components/dialogs/previewDialog/docx"
import VideoPreview from "@/components/dialogs/previewDialog/video"
import useIsMobile from "@/hooks/useIsMobile"

export const File = memo(({ info }: { info?: Omit<FileLinkInfoResponse, "size"> & { size: number } }) => {
	const filePublicLinkInfo = useFilePublicLinkInfo(info)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const urlState = usePublicLinkURLState()
	const [urlObject, setURLObject] = useState<string | null>(null)
	const [buffer, setBuffer] = useState<Buffer | null>()
	const didLoadItemRef = useRef<boolean>(false)
	const { dark } = useTheme()
	const [hidePreview, setHidePreview] = useState<boolean>(false)
	const isMobile = useIsMobile()

	const item = useMemo(() => {
		if (!filePublicLinkInfo.status) {
			return null
		}

		return {
			name: filePublicLinkInfo.info.name,
			uuid: filePublicLinkInfo.info.uuid,
			parent: "",
			size: filePublicLinkInfo.info.size,
			selected: false,
			chunks: filePublicLinkInfo.info.chunks,
			type: "file",
			bucket: filePublicLinkInfo.info.bucket,
			rm: "",
			region: filePublicLinkInfo.info.region,
			sharerId: 0,
			receiverId: 0,
			receiverEmail: "",
			receivers: [],
			sharerEmail: "",
			favorited: false,
			key: filePublicLinkInfo.key,
			lastModified: Date.now(),
			timestamp: Date.now(),
			version: filePublicLinkInfo.info.version,
			mime: filePublicLinkInfo.info.mime
		} satisfies DriveCloudItem
	}, [filePublicLinkInfo])

	const previewType = useMemo(() => {
		if (!item || urlState.hidePreview) {
			return "other"
		}

		return fileNameToPreviewType(item.name)
	}, [item, urlState.hidePreview])

	const canLoadItem = useMemo(() => {
		return (
			(previewType === "image" ||
				previewType === "md" ||
				previewType === "code" ||
				previewType === "text" ||
				previewType === "pdf" ||
				previewType === "docx" ||
				previewType === "video") &&
			!urlState.hidePreview
		)
	}, [previewType, urlState.hidePreview])

	const download = useCallback(async () => {
		if (!item) {
			return
		}

		const toast = loadingToast()

		try {
			await downloadFile({ item })
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			}
		} finally {
			toast.dismiss()
		}
	}, [item, errorToast, loadingToast])

	const topBar = useMemo(() => {
		if (!item) {
			return null
		}

		return (
			<div
				className={cn(
					"flex flex-row w-full h-14 border-b items-center px-4 justify-between z-50 gap-4",
					dark ? "bg-[#151518]" : "bg-[#FBFBFB]"
				)}
			>
				<div className="flex flex-row gap-2 items-center">
					<img
						src={fileNameToSVGIcon(item.name)}
						className="w-5 h-5 shrink-0 object-cover"
						draggable={false}
					/>
					<p className="line-clamp-1 text-ellipsis break-all">{item.name}</p>
					{!isMobile && (
						<p className="text-muted-foreground line-clamp-1 text-ellipsis break-all text-sm">{formatBytes(item.size)}</p>
					)}
				</div>
				<div className="flex flex-row gap-2 items-center shrink-0">
					<Button
						onClick={() => setHidePreview(true)}
						className="items-center gap-2 shrink-0"
						size="sm"
						variant="secondary"
					>
						<EyeOff size={16} />
						{!isMobile && "Hide preview"}
					</Button>
					<Button
						onClick={download}
						className="items-center gap-2 shrink-0"
						size="sm"
					>
						<Download size={16} />
						{!isMobile && "Download"}
					</Button>
				</div>
			</div>
		)
	}, [item, dark, download, isMobile])

	const loader = useMemo(() => {
		return (
			<Loader
				size={32}
				className="animate-spin-medium"
			/>
		)
	}, [])

	const preview = useCallback(() => {
		setHidePreview(false)
	}, [])

	const normal = useMemo(() => {
		if (!item) {
			return null
		}

		return (
			<div className="flex flex-col w-80 h-auto justify-center items-center">
				<div className="p-3 w-auto h-auto">
					<img
						src={fileNameToSVGIcon(item.name)}
						className="w-24 h-24 shrink-0 object-cover"
						draggable={false}
					/>
				</div>
				<p className="mt-4 line-clamp-1 text-ellipsis break-all">{item.name}</p>
				<p className="text-muted-foreground mt-1 line-clamp-1 text-ellipsis break-all">{formatBytes(item.size)}</p>
				<div className="flex flex-row gap-2 items-center mt-8">
					{previewType !== "other" && !urlState.embed && (
						<Button
							variant="secondary"
							onClick={preview}
							className="items-center gap-2"
						>
							<Eye size={16} />
							Preview
						</Button>
					)}
					<Button
						onClick={download}
						className="items-center gap-2"
					>
						<Download size={16} />
						Download
					</Button>
				</div>
			</div>
		)
	}, [item, preview, download, previewType, urlState.embed])

	const loadFile = useCallback(async () => {
		if (!item || item.type !== "file" || didLoadItemRef.current || !canLoadItem) {
			return
		}

		didLoadItemRef.current = true

		const previewType = fileNameToPreviewType(item.name)

		if (previewType === "other" || item.size >= 256 * 1024 * 1024) {
			return
		}

		try {
			const buffer = await worker.readFile({ item, emitEvents: false })

			if (previewType === "text" || previewType === "docx" || previewType === "md" || previewType === "code") {
				setBuffer(buffer)
			} else {
				setURLObject(globalThis.URL.createObjectURL(new Blob([buffer], { type: item.mime })))
			}
		} catch (e) {
			console.error(e)
		}
	}, [item, canLoadItem])

	useEffect(() => {
		if (item && canLoadItem) {
			loadFile()
		}
	}, [loadFile, canLoadItem, item])

	return (
		<div className="flex flex-col w-full h-full items-center justify-center">
			{!filePublicLinkInfo.status || !item ? (
				loader
			) : (
				<>
					{hidePreview || previewType === "other" || urlState.hidePreview ? (
						normal
					) : (
						<>
							{previewType === "image" ? (
								<>
									{urlObject ? (
										<>
											{topBar}
											<ImagePreview
												urlObject={urlObject}
												item={item}
												publicLink={true}
											/>
										</>
									) : (
										loader
									)}
								</>
							) : previewType === "md" || previewType === "code" || previewType === "text" ? (
								<>
									{buffer ? (
										<>
											{topBar}
											<TextPreview
												buffer={buffer}
												item={item}
												publicLink={true}
											/>
										</>
									) : (
										loader
									)}
								</>
							) : previewType === "pdf" ? (
								<>
									{urlObject ? (
										<>
											{topBar}
											<PDFPreview urlObject={urlObject} />
										</>
									) : (
										loader
									)}
								</>
							) : previewType === "video" ? (
								<>
									{urlObject ? (
										<>
											{topBar}
											<VideoPreview urlObject={urlObject} />
										</>
									) : (
										loader
									)}
								</>
							) : previewType === "docx" ? (
								<>
									{buffer ? (
										<>
											{topBar}
											<div className={cn("h-full", isMobile ? "w-screen" : "w-full")}>
												<DocXPreview buffer={buffer} />
											</div>
										</>
									) : (
										loader
									)}
								</>
							) : (
								normal
							)}
						</>
					)}
				</>
			)}
		</div>
	)
})

export default File
