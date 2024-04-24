import { create } from "zustand"

export type ContactsStore = {
	requestsInCount: number
	setRequestsInCount: (fn: number | ((prev: number) => number)) => void
}

export const useContactsStore = create<ContactsStore>(set => ({
	requestsInCount: 0,
	setRequestsInCount(fn) {
		set(state => ({ requestsInCount: typeof fn === "function" ? fn(state.requestsInCount) : fn }))
	}
}))
