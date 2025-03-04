import { memo, useState, useCallback, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronRight, ChevronLeft, LoaderIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import useWindowSize from "@/hooks/useWindowSize"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url"
import { showInputDialog } from "../input"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { type OnItemClickArgs } from "react-pdf/dist/esm/shared/types.js"
import useIsMobile from "@/hooks/useIsMobile"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export const PDF = memo(({ urlObject }: { urlObject: string }) => {
	const [numPages, setNumPages] = useState<number>(0)
	const [pageNumber, setPageNumber] = useState<number>(1)
	const windowSize = useWindowSize()
	const { t } = useTranslation()
	const [didEnterNoPassword, setDidEnterNoPassword] = useState<boolean>(false)
	const isMobile = useIsMobile()

	const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
		setDidEnterNoPassword(false)
		setNumPages(numPages)
	}, [])

	const prevPage = useCallback(() => {
		if (numPages <= 1) {
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
	}, [numPages, pageNumber])

	const nextPage = useCallback(() => {
		if (numPages <= 1) {
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
	}, [numPages, pageNumber])

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

	const onPassword = useCallback(
		async (callback: (password: string) => void) => {
			const inputResponse = await showInputDialog({
				title: t("dialogs.pdfPassword.title"),
				continueButtonText: t("dialogs.pdfPassword.continue"),
				value: "",
				autoFocusInput: true,
				placeholder: t("dialogs.pdfPassword.placeholder")
			})

			if (inputResponse.cancelled || inputResponse.value.length === 0) {
				setDidEnterNoPassword(true)

				return
			}

			callback(inputResponse.value)
		},
		[t]
	)

	const onItemClick = useCallback((args: OnItemClickArgs) => {
		setPageNumber(args.pageNumber)
	}, [])

	const width = useMemo(() => {
		return isMobile ? windowSize.width : 800
	}, [isMobile, windowSize.width])

	return (
		<div className="w-full h-full bg-primary-foreground">
			<div className="flex flex-row w-full h-full justify-center">
				{didEnterNoPassword ? (
					<div className="flex flex-col items-center justify-center w-full h-full">
						<p>{t("previewDialog.pdfNoPassword")}</p>
						<Button
							className="mt-4"
							onClick={() => setDidEnterNoPassword(false)}
						>
							{t("previewDialog.unlock")}
						</Button>
					</div>
				) : (
					<div className="flex flex-col w-full h-full items-center">
						<Document
							file={urlObject}
							onLoadSuccess={onLoadSuccess}
							className={cn(
								"flex flex-1 flex-row h-full justify-center overflow-x-hidden overflow-y-auto select-text",
								`w-[${width}px]`
							)}
							externalLinkTarget="_blank"
							loading={components.loading}
							error={components.error}
							noData={components.noData}
							onPassword={onPassword}
							onItemClick={onItemClick}
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
						{numPages > 1 && (
							<div className="flex flex-row items-center justify-center w-full h-10 bg-muted p-2 text-muted-foreground">
								<div className="flex flex-row items-center">
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
						)}
					</div>
				)}
			</div>
		</div>
	)
})

export default PDF
