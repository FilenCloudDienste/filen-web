import { keys, getItem, removeItem } from "@/lib/localForage"
import { type MessageDisplayType } from "./components/chats/conversation/message/utils"
import { type DirectorySizeResult } from "@/lib/worker/worker"

export const directorySizeCache = new Map<string, DirectorySizeResult>()
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

				if (!ex[1]) {
					continue
				}

				const result = await getItem<string>(dbKey)

				directoryUUIDToNameCache.set(ex[1], result!)
			}

			if (dbKey.startsWith("directorySize:")) {
				const ex = dbKey.split(":")

				if (!ex[1]) {
					continue
				}

				const result = await getItem<DirectorySizeResult>(dbKey)

				directorySizeCache.set(ex[1], result!)
			}
		}
	} catch (e) {
		console.error(e)
	}

	console.log("Warmed up cache in", Date.now() - start, "ms")
}

/**
 * Calculate the thumbnail cache usage (localForage).
 *
 * @export
 * @async
 * @returns {Promise<number>}
 */
export async function calculateThumbnailCacheUsage(): Promise<number> {
	const dbKeys = await keys()
	let size = 0

	for (const dbKey of dbKeys) {
		if (dbKey.startsWith("thumbnail:")) {
			const result = await getItem<Blob>(dbKey)

			size += result ? result.size : 0
		}
	}

	return size
}

/**
 * Clear the thumbnail cache (localForage).
 *
 * @export
 * @async
 * @returns {Promise<void>}
 */
export async function clearThumbnailCache(): Promise<void> {
	const dbKeys = await keys()

	for (const dbKey of dbKeys) {
		if (dbKey.startsWith("thumbnail:")) {
			await removeItem(dbKey)
		}
	}
}

warmupCacheFromDb()
