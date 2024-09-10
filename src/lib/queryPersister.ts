import localForage from "localforage"
// @ts-expect-error Not typed
import memoryStorageDriver from "localforage-memoryStorageDriver"

export const VERSION = 1
export const queryClientPersisterPrefix = "reactQueryV1"

export const store = localForage.createInstance({
	name: "Filen_reactQuery",
	version: 1.0,
	storeName: "filen_reactQuery_v" + VERSION,
	size: 1024 * 1024 * 1024
})

store.defineDriver(memoryStorageDriver).catch(console.error)
store.setDriver([store.INDEXEDDB, memoryStorageDriver._driver]).catch(console.error)

export function createIDBPersister() {
	return {
		getItem: (key: string) => {
			return store.getItem(key)
		},
		setItem: (key: string, value: unknown) => {
			return store.setItem(key, value)
		},
		removeItem: (key: string) => {
			return store.removeItem(key)
		},
		keys: () => {
			return store.keys()
		},
		clear: () => {
			return store.clear()
		}
	}
}

export const queryClientPersisterIDB = createIDBPersister()

export default queryClientPersisterIDB
