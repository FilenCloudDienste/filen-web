import { create } from "zustand"
import { type DriveCloudItem } from "@/components/drive"
import { type CloudItemReceiver } from "@filen/sdk/dist/types/cloud"

export type DriveItemsStore = {
	items: DriveCloudItem[]
	searchTerm: string
	setItems: (fn: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])) => void
	setSearchTerm: (fn: string | ((prev: string) => string)) => void
}

export const useDriveItemsStore = create<DriveItemsStore>(set => ({
	items: [],
	searchTerm: "",
	setItems(fn) {
		set(state => ({ items: typeof fn === "function" ? fn(state.items) : fn }))
	},
	setSearchTerm(fn) {
		set(state => ({ searchTerm: typeof fn === "function" ? fn(state.searchTerm) : fn }))
	}
}))

export type DriveSharedStore = {
	currentReceiverId: number
	currentReceiverEmail: string
	currentSharerId: number
	currentSharerEmail: string
	currentReceivers: CloudItemReceiver[]
	setCurrentReceiverId: (fn: number | ((prev: number) => number)) => void
	setCurrentReceiverEmail: (fn: string | ((prev: string) => string)) => void
	setCurrentSharerId: (fn: number | ((prev: number) => number)) => void
	setCurrentSharerEmail: (fn: string | ((prev: string) => string)) => void
	setCurrentReceivers: (fn: CloudItemReceiver[] | ((prev: CloudItemReceiver[]) => CloudItemReceiver[])) => void
}

export const useDriveSharedStore = create<DriveSharedStore>(set => ({
	currentReceiverId: 0,
	currentReceiverEmail: "",
	currentSharerId: 0,
	currentSharerEmail: "",
	currentReceivers: [],
	setCurrentReceiverId(fn) {
		set(state => ({ currentReceiverId: typeof fn === "function" ? fn(state.currentReceiverId) : fn }))
	},
	setCurrentReceiverEmail(fn) {
		set(state => ({ currentReceiverEmail: typeof fn === "function" ? fn(state.currentReceiverEmail) : fn }))
	},
	setCurrentSharerId(fn) {
		set(state => ({ currentSharerId: typeof fn === "function" ? fn(state.currentSharerId) : fn }))
	},
	setCurrentSharerEmail(fn) {
		set(state => ({ currentSharerEmail: typeof fn === "function" ? fn(state.currentSharerEmail) : fn }))
	},
	setCurrentReceivers(fn) {
		set(state => ({ currentReceivers: typeof fn === "function" ? fn(state.currentReceivers) : fn }))
	}
}))
