export async function traverseDirectory(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
	const reader = entry.createReader()
	const result = await new Promise<(FileSystemEntry | FileSystemEntry[])[][]>((resolve, reject) => {
		const iterationAttempts: Promise<(FileSystemEntry | FileSystemEntry[])[]>[] = []

		const readEntries = () => {
			reader.readEntries(entries => {
				if (!entries.length) {
					resolve(Promise.all(iterationAttempts))

					return
				}

				iterationAttempts.push(
					Promise.all(
						entries.map(fileEntry => {
							if (fileEntry.isFile) {
								return fileEntry
							}

							return traverseDirectory(fileEntry as FileSystemDirectoryEntry)
						})
					)
				)

				readEntries()
			}, reject)
		}

		readEntries()
	})

	// Dirty "hack" to flatten the File array
	return result.flat(999999999).flat(999999999).flat(999999999)
}

export async function getAllFileEntries(dataTransferItemList: DataTransferItemList): Promise<FileSystemEntry[]> {
	const fileEntries: FileSystemEntry[] = []
	const queue: FileSystemEntry[] = []

	for (const item of dataTransferItemList) {
		const entry = item.webkitGetAsEntry()

		if (entry) {
			queue.push(entry)
		}
	}

	while (queue.length > 0) {
		const entry = queue.shift()

		if (!entry) {
			continue
		}

		if (entry.isFile) {
			fileEntries.push(entry)
		} else {
			fileEntries.push(...(await traverseDirectory(entry as FileSystemDirectoryEntry)))
		}
	}

	return fileEntries
}

export async function readLocalDroppedDirectory(items: DataTransferItemList): Promise<File[]> {
	const list = await getAllFileEntries(items)
	const files: File[] = []

	for (const item of list) {
		if (!item.isFile) {
			continue
		}

		files.push(
			await new Promise<File>((resolve, reject) => {
				;(item as FileSystemFileEntry).file(file => {
					Object.defineProperty(file, "webkitRelativePath", {
						value: item.fullPath.startsWith("/") ? item.fullPath.slice(1) : item.fullPath,
						writable: true
					})

					resolve(file)
				}, reject)
			})
		)
	}

	return files
}
