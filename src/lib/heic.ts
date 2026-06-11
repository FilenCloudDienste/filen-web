// libheif-bundle.mjs is an ESM file with WASM inlined as base64 — no CJS, no require(),
// no external .wasm fetch. We import it directly to avoid Vite's pre-bundler touching
// the 1.4 MB compiled bundle (which breaks with esbuild's CJS transformer).
import createLibheif from "libheif-js/libheif-wasm/libheif-bundle.mjs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LibHeif = any

let libheifInstance: LibHeif | null = null

async function getLibheif(): Promise<LibHeif> {
	if (libheifInstance) {
		return libheifInstance
	}

	const lib = createLibheif()

	await lib.ready

	libheifInstance = lib

	return lib
}

export async function convertHEICToJPEG(buffer: Buffer): Promise<Buffer> {
	const libheif = await getLibheif()
	const decoder = new libheif.HeifDecoder()
	const images: LibHeif[] = decoder.decode(new Uint8Array(buffer))

	if (!images.length) {
		throw new Error("HEIC image not found")
	}

	let result: { width: number; height: number; data: Uint8ClampedArray }

	try {
		const image = images[0]
		const width: number = image.get_width()
		const height: number = image.get_height()

		result = await new Promise((resolve, reject) => {
			image.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, (displayData: { data: Uint8ClampedArray } | null) => {
				if (!displayData) {
					reject(new Error("HEIC display error"))

					return
				}

				resolve({ width, height, data: displayData.data })
			})
		})
	} finally {
		for (const image of images) {
			image.free()
		}

		decoder.decoder.delete()
	}

	const { width, height, data } = result
	const canvas = new OffscreenCanvas(width, height)
	const ctx = canvas.getContext("2d")

	if (!ctx) {
		throw new Error("Could not get OffscreenCanvas context")
	}

	ctx.putImageData(new ImageData(data, width, height), 0, 0)

	const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })

	return Buffer.from(await blob.arrayBuffer())
}

export function isHEIC(name: string): boolean {
	const lower = name.toLowerCase()

	return lower.endsWith(".heic") || lower.endsWith(".heif")
}
