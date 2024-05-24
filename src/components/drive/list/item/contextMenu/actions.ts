import { type DriveCloudItem } from "@/components/drive"
import * as workerProxy from "@/lib/worker/proxy"
import worker from "@/lib/worker"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showInputDialog } from "@/components/dialogs/input"
import { directoryUUIDToNameCache } from "@/cache"
import { IS_DESKTOP } from "@/constants"

export async function download({ selectedItems, name }: { selectedItems: DriveCloudItem[]; name?: string }): Promise<void> {
	if (selectedItems.length === 0 || !selectedItems[0]) {
		return
	}

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
					name: destination.name
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
				name: destination.name
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
				name: selectedItems[0].name
			})
		} else {
			await workerProxy.downloadFile({ item: selectedItems[0] })
		}
	} else {
		await workerProxy.downloadMultipleFilesAndDirectoriesAsZip({
			items: selectedItems,
			name
		})
	}
}

export async function move({ selectedItems, parent }: { selectedItems: DriveCloudItem[]; parent: string }): Promise<void> {
	await worker.moveItems({ items: selectedItems, parent })
}

export async function trash({ selectedItems }: { selectedItems: DriveCloudItem[] }): Promise<boolean> {
	if (
		!(await showConfirmDialog({
			title: "d",
			continueButtonText: "ddd",
			description: "ookeoetrasher",
			continueButtonVariant: "destructive"
		}))
	) {
		return false
	}

	await worker.trashItems({ items: selectedItems })

	return true
}

export async function restore({ selectedItems }: { selectedItems: DriveCloudItem[] }): Promise<void> {
	await worker.restoreItems({ items: selectedItems })
}

export async function rename({ item }: { item: DriveCloudItem }): Promise<string> {
	const inputResponse = await showInputDialog({
		title: "rename",
		continueButtonText: "rename",
		continueButtonVariant: "default",
		value: item.name,
		autoFocusInput: true,
		placeholder: item.name
	})

	if (inputResponse.cancelled || inputResponse.value.toLowerCase() === item.name.toLowerCase()) {
		return item.name
	}

	await worker.renameItem({ item, name: inputResponse.value })

	if (item.type === "directory") {
		directoryUUIDToNameCache.set(item.uuid, inputResponse.value)
	}

	return inputResponse.value
}

export async function deletePermanently({ selectedItems }: { selectedItems: DriveCloudItem[] }): Promise<boolean> {
	if (
		!(await showConfirmDialog({
			title: "d",
			continueButtonText: "perm deelete",
			description: "perm",
			continueButtonVariant: "destructive"
		}))
	) {
		return false
	}

	await worker.deleteItemsPermanently({ items: selectedItems })

	return true
}

export async function favorite({ selectedItems, favorite }: { selectedItems: DriveCloudItem[]; favorite: boolean }): Promise<void> {
	await worker.favoriteItems({ items: selectedItems, favorite })
}

export async function share({ selectedItems, requestUUID }: { selectedItems: DriveCloudItem[]; requestUUID?: string }): Promise<void> {
	const inputResponse = await showInputDialog({
		title: "share",
		continueButtonText: "share",
		continueButtonVariant: "default",
		value: "",
		autoFocusInput: true,
		placeholder: "email"
	})

	if (inputResponse.cancelled) {
		return
	}

	await worker.shareItemsToUser({ items: selectedItems, receiverEmail: inputResponse.value, requestUUID })
}

export async function changeColor({ uuid, color }: { uuid: string; color: string }): Promise<void> {
	await worker.changeDirectoryColor({ uuid, color })
}
