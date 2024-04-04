import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { create } from "zustand"

export type ChatsStore = {
	conversations: ChatConversation[]
	selectedConversation: ChatConversation | null
	search: string
	setConversations: (fn: ChatConversation[] | ((prev: ChatConversation[]) => ChatConversation[])) => void
	setSelectedConversation: (fn: ChatConversation | null | ((prev: ChatConversation | null) => ChatConversation | null)) => void
	setSearch: (fn: string | ((prev: string) => string)) => void
}

export const useChatsStore = create<ChatsStore>(set => ({
	conversations: [],
	selectedConversation: null,
	search: "",
	setConversations(fn) {
		set(state => ({ conversations: typeof fn === "function" ? fn(state.conversations) : fn }))
	},
	setSelectedConversation(fn) {
		set(state => ({ selectedConversation: typeof fn === "function" ? fn(state.selectedConversation) : fn }))
	},
	setSearch(fn) {
		set(state => ({ search: typeof fn === "function" ? fn(state.search) : fn }))
	}
}))
