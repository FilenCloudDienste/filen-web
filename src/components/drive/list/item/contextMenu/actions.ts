import { type DriveCloudItem } from "@/components/drive"
import * as workerProxy from "@/lib/worker/proxy"
import worker from "@/lib/worker"
import { directoryUUIDToNameCache } from "@/cache"
import { IS_DESKTOP } from "@/constants"
import { type DirDownloadType } from "@filen/sdk/dist/types/api/v3/dir/download"

export const activeDownloads: Record<string, boolean> = {}

export async function download({
	selectedItems,
	name,
	type,
	linkUUID,
	linkHasPassword,
	linkPassword,
	linkSalt,
	linkKey
}: {
	selectedItems: DriveCloudItem[]
	name?: string
	type?: DirDownloadType
	linkUUID?: string
	linkHasPassword?: boolean
	linkPassword?: string
	linkSalt?: string
	linkKey?: string
}): Promise<void> {
	selectedItems = selectedItems.filter(item => !activeDownloads[item.uuid])

	if (selectedItems.length === 0 || !selectedItems[0]) {
		return
	}

	for (const item of selectedItems) {
		activeDownloads[item.uuid] = true
	}

	try {
		if (IS_DESKTOP) {
			const destination = await window.desktopAPI.showSaveDialog({
				nameSuggestion: name ? name : selectedItems.length === 1 ? selectedItems[0].name : `Download_${Date.now()}`
			})

			if (destination.cancelled) {
				return
			}

			if (selectedItems.length === 1) {
				if (selectedItems[0].size <= 0) {
					return
				}

				if (selectedItems[0].type === "directory") {
					await window.desktopAPI.downloadDirectory({
						uuid: selectedItems[0].uuid,
						to: destination.path,
						name: destination.name,
						type,
						linkUUID,
						linkHasPassword,
						linkPassword,
						linkSalt,
						linkKey
					})
				} else {
					await window.desktopAPI.downloadFile({
						item: selectedItems[0],
						to: destination.path,
						name: destination.name
					})
				}
			} else {
				await window.desktopAPI.downloadMultipleFilesAndDirectories({
					items: selectedItems,
					to: destination.path,
					name: destination.name,
					type,
					linkUUID,
					linkHasPassword,
					linkPassword,
					linkSalt,
					linkKey
				})
			}

			return
		}

		if (selectedItems.length === 1) {
			if (selectedItems[0].size <= 0) {
				return
			}

			if (selectedItems[0].type === "directory") {
				await workerProxy.downloadDirectory({
					uuid: selectedItems[0].uuid,
					name: selectedItems[0].name,
					type,
					linkUUID,
					linkHasPassword,
					linkPassword,
					linkSalt,
					linkKey
				})
			} else {
				await workerProxy.downloadFile({ item: selectedItems[0] })
			}
		} else {
			await workerProxy.downloadMultipleFilesAndDirectoriesAsZip({
				items: selectedItems,
				name,
				type,
				linkUUID,
				linkHasPassword,
				linkPassword,
				linkSalt,
				linkKey
			})
		}
	} finally {
		for (const item of selectedItems) {
			delete activeDownloads[item.uuid]
		}
	}
}

export async function move({ selectedItems, parent }: { selectedItems: DriveCloudItem[]; parent: string }): Promise<void> {
	await worker.moveItems({
		items: selectedItems,
		parent
	})
}

export async function trash({ selectedItems }: { selectedItems: DriveCloudItem[] }): Promise<boolean> {
	await worker.trashItems({
		items: selectedItems
	})

	return true
}

export async function restore({ selectedItems }: { selectedItems: DriveCloudItem[] }): Promise<void> {
	await worker.restoreItems({
		items: selectedItems
	})
}

export async function rename({ item, newName }: { item: DriveCloudItem; newName: string }): Promise<string> {
	await worker.renameItem({
		item,
		name: newName
	})

	if (item.type === "directory") {
		directoryUUIDToNameCache.set(item.uuid, newName)
	}

	return newName
}

export async function deletePermanently({ selectedItems }: { selectedItems: DriveCloudItem[] }): Promise<boolean> {
	await worker.deleteItemsPermanently({
		items: selectedItems
	})

	return true
}

export async function favorite({ selectedItems, favorite }: { selectedItems: DriveCloudItem[]; favorite: boolean }): Promise<void> {
	await worker.favoriteItems({
		items: selectedItems,
		favorite
	})
}

export async function share({
	selectedItems,
	requestUUID,
	receiverEmail
}: {
	selectedItems: DriveCloudItem[]
	requestUUID?: string
	receiverEmail: string
}): Promise<void> {
	await worker.shareItemsToUser({
		items: selectedItems,
		receiverEmail,
		requestUUID
	})
}

export async function changeColor({ uuid, color }: { uuid: string; color: string }): Promise<void> {
	await worker.changeDirectoryColor({
		uuid,
		color
	})
}
