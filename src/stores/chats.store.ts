import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { create } from "zustand"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"

export type ChatsStore = {
	conversations: ChatConversation[]
	selectedConversation: ChatConversation | null
	search: string
	messages: ChatMessage[]
	failedMessages: string[]
	editUUID: string
	replyMessage: ChatMessage | null
	setConversations: (fn: ChatConversation[] | ((prev: ChatConversation[]) => ChatConversation[])) => void
	setSelectedConversation: (fn: ChatConversation | null | ((prev: ChatConversation | null) => ChatConversation | null)) => void
	setSearch: (fn: string | ((prev: string) => string)) => void
	setMessages: (fn: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
	setFailedMessages: (fn: string[] | ((prev: string[]) => string[])) => void
	setEditUUID: (fn: string | ((prev: string) => string)) => void
	setReplyMessage: (fn: ChatMessage | null | ((prev: ChatMessage | null) => ChatMessage | null)) => void
}

export const useChatsStore = create<ChatsStore>(set => ({
	conversations: [],
	selectedConversation: null,
	search: "",
	messages: [],
	failedMessages: [],
	editUUID: "",
	replyMessage: null,
	setConversations(fn) {
		set(state => ({ conversations: typeof fn === "function" ? fn(state.conversations) : fn }))
	},
	setSelectedConversation(fn) {
		set(state => ({ selectedConversation: typeof fn === "function" ? fn(state.selectedConversation) : fn }))
	},
	setSearch(fn) {
		set(state => ({ search: typeof fn === "function" ? fn(state.search) : fn }))
	},
	setMessages(fn) {
		set(state => ({ messages: typeof fn === "function" ? fn(state.messages) : fn }))
	},
	setFailedMessages(fn) {
		set(state => ({ failedMessages: typeof fn === "function" ? fn(state.failedMessages) : fn }))
	},
	setEditUUID(fn) {
		set(state => ({ editUUID: typeof fn === "function" ? fn(state.editUUID) : fn }))
	},
	setReplyMessage(fn) {
		set(state => ({ replyMessage: typeof fn === "function" ? fn(state.replyMessage) : fn }))
	}
}))
