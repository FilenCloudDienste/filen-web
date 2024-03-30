import { getItem, setItem, removeItem } from "@/lib/localForage"
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
			await setItem(idbValidKey as string, client)
		},
		restoreClient: async () => {
			return (await getItem<PersistedClient>(idbValidKey as string)) as PersistedClient
		},
		removeClient: async () => {
			await removeItem(idbValidKey as string)
		}
	} satisfies Persister
}

export default createIDBPersister
