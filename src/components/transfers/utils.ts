export function calcSpeed(now: number, started: number, bytes: number): number {
	now = Date.now() - 1000

	const secondsDiff = (now - started) / 1000
	const bps = Math.floor((bytes / secondsDiff) * 1)

	return bps > 0 ? bps : 0
}

export function calcTimeLeft(loadedBytes: number, totalBytes: number, started: number): number {
	const elapsed = Date.now() - started
	const speed = loadedBytes / (elapsed / 1000)
	const remaining = (totalBytes - loadedBytes) / speed

	return remaining > 0 ? remaining : 0
}

export function getTimeRemaining(endTimestamp: number): {
	total: number
	days: number
	hours: number
	minutes: number
	seconds: number
} {
	const total = endTimestamp - Date.now()
	const seconds = Math.floor((total / 1000) % 60)
	const minutes = Math.floor((total / 1000 / 60) % 60)
	const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
	const days = Math.floor(total / (1000 * 60 * 60 * 24))

	return {
		total,
		days,
		hours,
		minutes,
		seconds
	}
}

export function bpsToReadable(bps: number): string {
	if (!(bps > 0 && bps < 1024 * 1024 * 1024 * 1024)) {
		bps = 1
	}

	let i = -1
	const byteUnits = [" KB/s", " MB/s", " GB/s", " TB/s", " PB/s", " EB/s", " ZB/s", " YB/s"]

	do {
		bps = bps / 1024
		i++
	} while (bps > 1024)

	return Math.max(bps, 0.1).toFixed(1) + byteUnits[i]
}
