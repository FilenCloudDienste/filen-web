import { create } from "zustand"

export type TransferState = "started" | "queued" | "finished" | "error"

export type Transfer = {
	type: "upload" | "download"
	uuid: string
	state: TransferState
	bytes: number
	name: string
	size: number
}

export type TransfersStore = {
	transfers: Transfer[]
	setTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
}

export const useTransfersStore = create<TransfersStore>(set => ({
	transfers: [],
	setTransfers(fn) {
		set(state => ({ transfers: typeof fn === "function" ? fn(state.transfers) : fn }))
	}
}))
