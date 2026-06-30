/**
 * Whether a file name is a HEIC/HEIF image, based on its extension.
 *
 * Kept in its own lightweight module (no libheif/WASM import) so it can be imported
 * statically anywhere without pulling the ~1.4 MB decoder bundle into that graph. The
 * actual decoder lives in `./decode`, which is only ever loaded via dynamic import().
 *
 * @export
 * @param {string} name
 * @returns {boolean}
 */
export function isHEIC(name: string): boolean {
	const lower = name.toLowerCase()

	return lower.endsWith(".heic") || lower.endsWith(".heif")
}
