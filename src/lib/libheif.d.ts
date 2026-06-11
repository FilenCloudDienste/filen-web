declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createLibheif: (options?: Record<string, unknown>) => any
	export default createLibheif
}
