import SDK from "../sdk"
import { FilenSDKConfig } from "@filen/sdk"
import { type FileSystemFileHandle } from "native-file-system-adapter"
import { type DriveCloudItem } from "@/components/drive"
import { set } from "idb-keyval"
import { orderItemsByType } from "@/components/drive/utils"

let isInitialized = false

export async function waitForInitialization(): Promise<void> {
	if (isInitialized) {
		return
	}

	await new Promise<void>(resolve => {
		const wait = setInterval(() => {
			if (isInitialized) {
				clearInterval(wait)

				resolve()
			}
		}, 10)
	})
}

export async function initializeSDK({ config }: { config: FilenSDKConfig }): Promise<void> {
	if (isInitialized) {
		return
	}

	SDK.init(config)

	isInitialized = true
}

export async function encryptMetadata({ metadata, key, derive }: { metadata: string; key?: string; derive?: boolean }) {
	await waitForInitialization()

	return await SDK.crypto().encrypt().metadata({ metadata, key, derive })
}

export async function decryptMetadata({ metadata, key }: { metadata: string; key: string }) {
	await waitForInitialization()

	return await SDK.crypto().decrypt().metadata({ metadata, key })
}

export async function listDirectory({ uuid }: { uuid: string }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectory({ uuid })
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function listDirectorySharedIn({ uuid }: { uuid: string }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectorySharedIn({ uuid })
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push(
			item.type === "file"
				? {
						...item,
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false,
						rm: ""
					}
				: {
						...item,
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false
					}
		)

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function listDirectorySharedOut({ uuid, receiverId }: { uuid: string; receiverId?: number }): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listDirectorySharedOut({ uuid, receiverId })
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push(
			item.type === "file"
				? {
						...item,
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false,
						rm: ""
					}
				: {
						...item,
						sharerId: item.sharerId,
						sharerEmail: item.sharerEmail,
						receiverId: 0,
						receiverEmail: "",
						selected: false,
						favorited: false
					}
		)

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function listFavorites(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listFavorites()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function listPublicLinks(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listPublicLinks()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function listRecents(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listRecents()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function listTrash(): Promise<DriveCloudItem[]> {
	await waitForInitialization()

	const items = await SDK.cloud().listTrash()
	const driveItems: DriveCloudItem[] = []

	for (const item of items) {
		driveItems.push({
			...item,
			sharerId: 0,
			sharerEmail: "",
			receiverId: 0,
			receiverEmail: "",
			selected: false,
			receivers: []
		})

		if (item.type === "directory") {
			set(`directoryUUIDToName:${item.uuid}`, item.name).catch(console.error)
		}
	}

	return orderItemsByType({ items: driveItems, type: "nameAsc" })
}

export async function downloadFile({ item, fileHandle }: { item: DriveCloudItem; fileHandle: FileSystemFileHandle }): Promise<void> {
	await waitForInitialization()

	if (item.type !== "file") {
		return
	}

	const stream = await SDK.cloud().downloadFileToReadableStream({
		uuid: item.uuid,
		bucket: item.bucket,
		region: item.region,
		version: item.version,
		chunks: item.chunks,
		key: item.key
	})

	const writer = await fileHandle.createWritable()

	stream.pipeTo(writer)
}

export async function uploadFile({ file, parent }: { file: File; parent: string }): Promise<void> {
	await waitForInitialization()

	await SDK.cloud().uploadWebFile({ file, parent, name: file.name })
}

export async function directorySize({
	uuid,
	sharerId,
	receiverId,
	trash
}: {
	uuid: string
	sharerId?: number | undefined
	receiverId?: number | undefined
	trash?: boolean | undefined
}): Promise<number> {
	await waitForInitialization()

	return await SDK.cloud().directorySize({ uuid, sharerId, receiverId, trash })
}
