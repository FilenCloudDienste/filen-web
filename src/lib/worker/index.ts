export const worker = new ComlinkWorker<typeof import("./worker")>(new URL("./worker", import.meta.url), {
	type: "module"
})

export default worker
