// libheif-bundle.mjs is an ESM build with the WASM inlined as base64 — no separate
// .wasm fetch and no asset wiring needed. It is imported ONLY from this module, which
// in turn is only ever loaded via dynamic import(), so the ~1.4 MB bundle stays in its
// own async chunk and never enters the main or worker entry bundles.
import createLibheif from "libheif-js/libheif-wasm/libheif-bundle.mjs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LibHeif = any

let libheifPromise: Promise<LibHeif> | null = null

async function createLibheifInstance(): Promise<LibHeif> {
	const lib = createLibheif()

	// Some libheif builds expose a `ready` promise; this build initializes the WASM
	// synchronously, so only await it when present.
	if (lib.ready) {
		await lib.ready
	}

	return lib
}

// Memoize the instance via a Promise (not the resolved value) so concurrent callers —
// e.g. several thumbnails decoding at once — share a single WASM init instead of racing
// to create multiple instances. A failed init is NOT cached, so a later call can retry.
async function getLibheif(): Promise<LibHeif> {
	if (!libheifPromise) {
		libheifPromise = createLibheifInstance()
	}

	try {
		return await libheifPromise
	} catch (e) {
		libheifPromise = null

		throw e
	}
}

/**
 * Decode a HEIC/HEIF file into raw RGBA pixels.
 *
 * libheif applies the container's `irot`/`imir` orientation transforms during decode,
 * so the returned pixels are already correctly oriented (no manual rotation needed).
 * For multi-image files (bursts / Live Photos) the first top-level image is used
 * (the wrapper's `is_primary()` helper is not available in this build).
 *
 * @export
 * @param {Uint8Array} buffer
 * @returns {Promise<ImageData>}
 */
export async function decodeHEIC(buffer: Uint8Array): Promise<ImageData> {
	const libheif = await getLibheif()
	const decoder = new libheif.HeifDecoder()
	// decoder.decode() allocates a heif_context internally before it can fail, so both the
	// decode and the empty-result check must run inside the try — otherwise an undecodable
	// file would leak the context (it is only freed in the finally below).
	let images: LibHeif[] = []

	try {
		images = decoder.decode(buffer)

		if (!images || images.length === 0) {
			throw new Error("No image found in HEIC file.")
		}

		const image = images[0]
		const width: number = image.get_width()
		const height: number = image.get_height()

		if (!width || !height) {
			throw new Error("Invalid HEIC image dimensions.")
		}

		const imageData = new ImageData(width, height)

		await new Promise<void>((resolve, reject) => {
			image.display(imageData, (displayData: ImageData | null) => {
				if (!displayData) {
					reject(new Error("HEIC decode failed."))

					return
				}

				resolve()
			})
		})

		return imageData
	} finally {
		for (const img of images) {
			img.free()
		}

		// decoder.decode() allocates a heif_context (a raw WASM pointer) and only
		// auto-frees it on the same decoder's next decode() call. We use a fresh decoder
		// per call, so free it explicitly here to avoid growing the WASM heap.
		if (decoder.decoder) {
			libheif.heif_context_free(decoder.decoder)
			decoder.decoder = null
		}
	}
}
