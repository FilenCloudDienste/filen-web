import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { create } from "zustand"

export type NotesStore = {
	notes: Note[]
	selectedNote: Note | null
	synced: boolean
	search: string
	activeTag: string
	maxSizeReached: boolean
	setNotes: (fn: Note[] | ((prev: Note[]) => Note[])) => void
	setSelectedNote: (fn: Note | null | ((prev: Note | null) => Note | null)) => void
	setSynced: (fn: boolean | ((prev: boolean) => boolean)) => void
	setSearch: (fn: string | ((prev: string) => string)) => void
	setActiveTag: (fn: string | ((prev: string) => string)) => void
	setMaxSizeReached: (fn: boolean | ((prev: boolean) => boolean)) => void
}

export const useNotesStore = create<NotesStore>(set => ({
	notes: [],
	selectedNote: null,
	synced: true,
	search: "",
	activeTag: "all",
	maxSizeReached: false,
	setNotes(fn) {
		set(state => ({ notes: typeof fn === "function" ? fn(state.notes) : fn }))
	},
	setSelectedNote(fn) {
		set(state => ({ selectedNote: typeof fn === "function" ? fn(state.selectedNote) : fn }))
	},
	setSynced(fn) {
		set(state => ({ synced: typeof fn === "function" ? fn(state.synced) : fn }))
	},
	setSearch(fn) {
		set(state => ({ search: typeof fn === "function" ? fn(state.search) : fn }))
	},
	setActiveTag(fn) {
		set(state => ({ activeTag: typeof fn === "function" ? fn(state.activeTag) : fn }))
	},
	setMaxSizeReached(fn) {
		set(state => ({ maxSizeReached: typeof fn === "function" ? fn(state.maxSizeReached) : fn }))
	}
}))
