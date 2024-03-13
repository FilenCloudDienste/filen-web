import { type DriveCloudItem } from "."

export function orderItemsByType({
	items,
	type
}: {
	items: DriveCloudItem[]
	type:
		| "nameAsc"
		| "sizeAsc"
		| "dateAsc"
		| "typeAsc"
		| "lastModifiedAsc"
		| "nameDesc"
		| "sizeDesc"
		| "dateDesc"
		| "typeDesc"
		| "lastModifiedDesc"
		| "uploadDateAsc"
		| "uploadDateDesc"
}): DriveCloudItem[] {
	const files: DriveCloudItem[] = []
	const folders: DriveCloudItem[] = []

	for (let i = 0; i < items.length; i++) {
		if (items[i].type === "file") {
			files.push(items[i])
		} else {
			folders.push(items[i])
		}
	}

	if (type === "nameAsc") {
		const sortedFiles = files.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		const sortedFolders = folders.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "sizeAsc") {
		const sortedFiles = files.sort((a, b) => {
			return a.size - b.size
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "dateAsc") {
		const sortedFiles = files.sort((a, b) => {
			return a.lastModified - b.lastModified
		})

		const sortedFolders = folders.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "dateDesc") {
		const sortedFiles = files.sort((a, b) => {
			return b.lastModified - a.lastModified
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "typeAsc") {
		const sortedFiles = files.sort((a, b) => {
			if (a.type !== "file" || b.type !== "file") {
				return 0
			}

			if (typeof a.mime === "undefined") {
				a.mime = "_"
			}

			if (typeof b.mime === "undefined") {
				b.mime = "_"
			}

			if (a.mime.length <= 1) {
				a.mime = "_"
			}

			if (b.mime.length <= 1) {
				b.mime = "_"
			}

			return a.mime.localeCompare(b.mime, "en", { numeric: true })
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "nameDesc") {
		const sortedFiles = files.sort((a, b) => {
			return b.name.localeCompare(a.name, "en", { numeric: true })
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.name.localeCompare(a.name, "en", { numeric: true })
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "sizeDesc") {
		const sortedFiles = files.sort((a, b) => {
			return b.size - a.size
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "typeDesc") {
		const sortedFiles = files.sort((a, b) => {
			if (a.type !== "file" || b.type !== "file") {
				return 0
			}

			if (typeof a.mime === "undefined") {
				a.mime = "_"
			}

			if (typeof b.mime === "undefined") {
				b.mime = "_"
			}

			if (a.mime.length <= 1) {
				a.mime = "_"
			}

			if (b.mime.length <= 1) {
				b.mime = "_"
			}

			return b.mime.localeCompare(a.mime, "en", { numeric: true })
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "lastModifiedAsc") {
		const sortedFiles = files.sort((a, b) => {
			return a.lastModified - b.lastModified
		})

		const sortedFolders = folders.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "lastModifiedDesc") {
		const sortedFiles = files.sort((a, b) => {
			return b.lastModified - a.lastModified
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "uploadDateAsc") {
		const sortedFiles = files.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		const sortedFolders = folders.sort((a, b) => {
			return a.timestamp - b.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else if (type === "uploadDateDesc") {
		const sortedFiles = files.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		const sortedFolders = folders.sort((a, b) => {
			return b.timestamp - a.timestamp
		})

		return sortedFolders.concat(sortedFiles)
	} else {
		const sortedFiles = files.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		const sortedFolders = folders.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", { numeric: true })
		})

		return sortedFolders.concat(sortedFiles)
	}
}
