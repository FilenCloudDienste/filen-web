import localForage from "localforage"
// @ts-expect-error Not typed
import memoryStorageDriver from "localforage-memoryStorageDriver"

export const VERSION = 1

export const store = localForage.createInstance({
	name: "Filen",
	version: 1.0,
	storeName: "filen_v" + VERSION,
	size: 1024 * 1024 * 1024
})

store.defineDriver(memoryStorageDriver).catch(console.error)
store.setDriver([store.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

export const { keys, getItem, setDriver, setItem, supports, getSerializer, getDriver, ready, removeItem, clear } = store

export default store
