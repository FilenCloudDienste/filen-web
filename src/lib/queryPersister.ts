import { get, set, del } from "idb-keyval"
import { PersistedClient, Persister } from "@tanstack/react-query-persist-client"

/**
 * Persist all queries in IndexedDB.
 * @date 3/13/2024 - 4:05:38 AM
 *
 * @export
 * @param {IDBValidKey} [idbValidKey="reactQuery"]
 * @returns {Persister}
 */
export function createIDBPersister(idbValidKey: IDBValidKey = "reactQuery") {
	return {
		persistClient: async (client: PersistedClient) => {
			await set(idbValidKey, client)
		},
		restoreClient: async () => {
			return await get<PersistedClient>(idbValidKey)
		},
		removeClient: async () => {
			await del(idbValidKey)
		}
	} satisfies Persister
}

export default createIDBPersister
