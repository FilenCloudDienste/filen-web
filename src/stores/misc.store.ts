import { create } from "zustand"

export type MiscStore = {
	lockDialogOpen: boolean
	updateDialogOpen: boolean
	isOnlineDialogOpen: boolean
	maintenanceDialogOpen: boolean
	setLockDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void
	setUpdateDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void
	setIsOnlineDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void
	setMaintenanceDialogOpen: (fn: boolean | ((prev: boolean) => boolean)) => void
}

export const useMiscStore = create<MiscStore>(set => ({
	lockDialogOpen: false,
	updateDialogOpen: false,
	isOnlineDialogOpen: false,
	maintenanceDialogOpen: false,
	setLockDialogOpen(fn) {
		set(state => ({
			lockDialogOpen: typeof fn === "function" ? fn(state.lockDialogOpen) : fn
		}))
	},
	setIsOnlineDialogOpen(fn) {
		set(state => ({
			isOnlineDialogOpen: typeof fn === "function" ? fn(state.isOnlineDialogOpen) : fn
		}))
	},
	setUpdateDialogOpen(fn) {
		set(state => ({
			updateDialogOpen: typeof fn === "function" ? fn(state.updateDialogOpen) : fn
		}))
	},
	setMaintenanceDialogOpen(fn) {
		set(state => ({
			maintenanceDialogOpen: typeof fn === "function" ? fn(state.maintenanceDialogOpen) : fn
		}))
	}
}))
