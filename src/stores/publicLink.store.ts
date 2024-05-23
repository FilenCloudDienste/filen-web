import { create } from "zustand"
import { type DriveCloudItem } from "@/components/drive"

export type DirectoryPublicLinkStore = {
	items: DriveCloudItem[]
	searchTerm: string
	virtualURL: string
	setItems: (fn: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])) => void
	setSearchTerm: (fn: string | ((prev: string) => string)) => void
	setVirtualURL: (fn: string | ((prev: string) => string)) => void
}

export const useDirectoryPublicLinkStore = create<DirectoryPublicLinkStore>(set => ({
	items: [],
	searchTerm: "",
	virtualURL: "",
	setItems(fn) {
		set(state => ({ items: typeof fn === "function" ? fn(state.items) : fn }))
	},
	setSearchTerm(fn) {
		set(state => ({ searchTerm: typeof fn === "function" ? fn(state.searchTerm) : fn }))
	},
	setVirtualURL(fn) {
		set(state => ({ virtualURL: typeof fn === "function" ? fn(state.virtualURL) : fn }))
	}
}))
