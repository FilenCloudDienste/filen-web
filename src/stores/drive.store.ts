import { create } from "zustand"
import { type DriveCloudItem } from "@/components/drive"

export type DriveItemsStore = {
	items: DriveCloudItem[]
	setItems: (fn: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])) => void
}

export const useDriveItemsStore = create<DriveItemsStore>(set => ({
	items: [],
	setItems(fn) {
		set(state => ({ items: typeof fn === "function" ? fn(state.items) : fn }))
	}
}))

export type DriveSharedStore = {
	currentReceiverId: number
	currentSharerId: number
	setCurrentReceiverId: (fn: number | ((prev: number) => number)) => void
	setCurrentSharerId: (fn: number | ((prev: number) => number)) => void
}

export const useDriveSharedStore = create<DriveSharedStore>(set => ({
	currentReceiverId: 0,
	currentSharerId: 0,
	setCurrentReceiverId(fn) {
		set(state => ({ currentReceiverId: typeof fn === "function" ? fn(state.currentReceiverId) : fn }))
	},
	setCurrentSharerId(fn) {
		set(state => ({ currentSharerId: typeof fn === "function" ? fn(state.currentSharerId) : fn }))
	}
}))
