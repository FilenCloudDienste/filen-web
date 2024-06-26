import { useLocalStorage } from "@uidotdev/usehooks"

export type VirtualDriveStore = {
	enabled: boolean
	driveLetter: string
	cacheSizeInGi: number
}

export const DEFAULT_VIRTUAL_DRIVE_STORE: VirtualDriveStore = {
	enabled: false,
	driveLetter: "X:",
	cacheSizeInGi: 10
}

export function useVirtualDriveStore() {
	const store = useLocalStorage<VirtualDriveStore>("virtualDriveStore", DEFAULT_VIRTUAL_DRIVE_STORE)

	return store
}
