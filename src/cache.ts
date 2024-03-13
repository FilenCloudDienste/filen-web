import { keys, get } from "idb-keyval"

export const directorySizeCache = new Map<string, number>()
export const directoryUUIDToNameCache = new Map<string, string>()

/**
 * Warmup the cache.
 * @date 3/13/2024 - 4:15:14 AM
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function warmupCacheFromDb(): Promise<void> {
	const start = Date.now()

	try {
		const dbKeys = await keys()

		for (const dbKey of dbKeys) {
			const dbKeyString = dbKey.toString()

			if (dbKeyString.startsWith("directoryUUIDToName:")) {
				const ex = dbKeyString.split(":")
				const result = await get(dbKeyString)

				directoryUUIDToNameCache.set(ex[1], result)
			}

			if (dbKeyString.startsWith("directorySize:")) {
				const ex = dbKeyString.split(":")
				const result = await get(dbKeyString)

				directorySizeCache.set(ex[1], result)
			}
		}
	} catch (e) {
		console.error(e)
	}

	console.log("Warmed up cache in", Date.now() - start, "ms")
}

warmupCacheFromDb()
