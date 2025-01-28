import { memo, useState, useCallback, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronRight, ChevronLeft, LoaderIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import useWindowSize from "@/hooks/useWindowSize"
import useIsMobile from "@/hooks/useIsMobile"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export const PDF = memo(({ urlObject }: { urlObject: string }) => {
	const [numPages, setNumPages] = useState<number>(0)
	const [pageNumber, setPageNumber] = useState<number>(1)
	const [hovering, setHovering] = useState<boolean>(false)
	const isMobile = useIsMobile()
	const windowSize = useWindowSize()

	const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
		setNumPages(numPages)
	}, [])

	const prevPage = useCallback(() => {
		if (!(hovering || isMobile) || numPages <= 1) {
			return
		}

		const prev = pageNumber - 1

		if (prev < 1) {
			setPageNumber(numPages)

			return
		}

		if (prev > numPages) {
			setPageNumber(1)

			return
		}

		setPageNumber(prev)
	}, [numPages, pageNumber, hovering, isMobile])

	const nextPage = useCallback(() => {
		if (!(hovering || isMobile) || numPages <= 1) {
			return
		}

		const next = pageNumber + 1

		if (next <= 1) {
			setPageNumber(numPages)

			return
		}

		if (next > numPages) {
			setPageNumber(1)

			return
		}

		setPageNumber(next)
	}, [numPages, pageNumber, hovering, isMobile])

	const onMouseEnter = useCallback(() => {
		if (numPages <= 1) {
			return
		}

		setHovering(true)
	}, [numPages])

	const onMouseLeave = useCallback(() => {
		if (numPages <= 1) {
			return
		}

		setHovering(false)
	}, [numPages])

	const components = useMemo(() => {
		return {
			loading: (
				<div className="flex flex-col items-center justify-center w-full h-full">
					<LoaderIcon className="animate-spin-medium" />
				</div>
			),
			error: (
				<div className="flex flex-col items-center justify-center w-full h-full">
					<p>Could not load PDF.</p>
				</div>
			),
			noData: (
				<div className="flex flex-col items-center justify-center w-full h-full">
					<p>PDF contains no data.</p>
				</div>
			)
		}
	}, [])

	const width = useMemo(() => {
		return isMobile ? windowSize.width : 800
	}, [isMobile, windowSize.width])

	return (
		<div className="w-full h-full bg-primary-foreground">
			<div className="flex flex-row w-full h-full justify-center">
				<Document
					file={urlObject}
					onLoadSuccess={onLoadSuccess}
					className={cn("flex flex-row h-full justify-center overflow-x-hidden overflow-y-auto select-text", `w-[${width}px]`)}
					externalLinkTarget="_blank"
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					loading={components.loading}
					error={components.error}
					noData={components.noData}
					options={
						import.meta.env.DEV
							? undefined
							: {
									standardFontDataUrl: "/pdfjs/standard_fonts/",
									cMapUrl: "/pdfjs/cmaps/"
								}
					}
				>
					<Page
						className="h-full select-text"
						pageNumber={pageNumber}
						loading={components.loading}
						error={components.error}
						noData={components.noData}
						width={width}
						scale={1}
						canvasBackground="white"
					/>
				</Document>
				<div
					className={cn(
						(isMobile || hovering) && numPages > 1 ? "opacity-100" : "opacity-0",
						"flex flex-row items-center absolute bottom-4 left-1/2 -translate-x-1/2 bg-muted border rounded-md animate-in animate-out transition-all z-50 p-2 text-muted-foreground"
					)}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				>
					<div
						className="flex flex-row items-center hover:bg-muted/40 cursor-pointer hover:text-primary"
						onClick={prevPage}
					>
						<ChevronLeft size={20} />
					</div>
					<p className="flex flex-row items-center justify-center w-14">
						{pageNumber} / {numPages}
					</p>
					<div
						className="flex flex-row items-center hover:bg-muted/40 cursor-pointer hover:text-primary"
						onClick={nextPage}
					>
						<ChevronRight size={20} />
					</div>
				</div>
			</div>
		</div>
	)
})

export default PDF
