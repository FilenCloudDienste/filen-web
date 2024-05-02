import { keys, getItem } from "@/lib/localForage"
import { type MessageDisplayType } from "./components/chats/conversation/message/utils"

export const directorySizeCache = new Map<string, number>()
export const directoryUUIDToNameCache = new Map<string, string>()
export const thumbnailURLObjectCache = new Map<string, string>()
export const chatDisplayMessageAsCache = new Map<string, Record<string, MessageDisplayType>>()
export const chatOGDataCache = new Map<string, Record<string, Record<string, string>>>()
export const workerCorsHeadCache = new Map<string, Record<string, string>>()
export const workerParseOGFromURLCache = new Map<string, Record<string, string>>()

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
			if (dbKey.startsWith("directoryUUIDToName:")) {
				const ex = dbKey.split(":")
				const result = await getItem<string>(dbKey)

				directoryUUIDToNameCache.set(ex[1], result!)
			}

			if (dbKey.startsWith("directorySize:")) {
				const ex = dbKey.split(":")
				const result = await getItem<number>(dbKey)

				directorySizeCache.set(ex[1], result!)
			}
		}
	} catch (e) {
		console.error(e)
	}

	console.log("Warmed up cache in", Date.now() - start, "ms")
}

warmupCacheFromDb()
