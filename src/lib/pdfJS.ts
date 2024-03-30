import * as pdfjsLib from "pdfjs-dist"
// @ts-expect-error Not typed
import * as pdfWorker from "pdfjs-dist/build/pdf.worker.mjs"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export { pdfjsLib }
export default pdfjsLib
