import { create } from "zustand"

export type TransferState = "started" | "queued" | "finished" | "error" | "stopped" | "paused"

export type Transfer = {
	type: "upload" | "download"
	uuid: string
	state: TransferState
	bytes: number
	name: string
	size: number
	startedTimestamp: number
	finishedTimestamp: number
	queuedTimestamp: number
	errorTimestamp: number
	progressTimestamp: number
	createdDirectories: number
	fileType: "file" | "directory"
}

export type TransfersStore = {
	transfers: Transfer[]
	finishedTransfers: Transfer[]
	speed: number
	remaining: number
	progress: number
	setTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
	setFinishedTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
	setSpeed: (fn: number | ((prev: number) => number)) => void
	setRemaining: (fn: number | ((prev: number) => number)) => void
	setProgress: (fn: number | ((prev: number) => number)) => void
}

export const useTransfersStore = create<TransfersStore>(set => ({
	transfers: [
		/*{
			type: "upload",
			uuid: "uuid",
			state: "started",
			bytes: 1,
			name: "foo.txt",
			size: 5,
			startedTimestamp: 0,
			finishedTimestamp: 0,
			queuedTimestamp: 0,
			errorTimestamp: 0,
			progressTimestamp: 0
		},
		{
			type: "upload",
			uuid: "uuid2",
			state: "started",
			bytes: 3,
			name: "foo.txt",
			size: 5,
			startedTimestamp: 0,
			finishedTimestamp: 0,
			queuedTimestamp: 0,
			errorTimestamp: 0,
			progressTimestamp: 0
		}*/
	],
	finishedTransfers: [],
	speed: 0,
	remaining: 0,
	progress: 0,
	setTransfers(fn) {
		set(state => ({ transfers: typeof fn === "function" ? fn(state.transfers) : fn }))
	},
	setFinishedTransfers(fn) {
		set(state => ({ finishedTransfers: typeof fn === "function" ? fn(state.finishedTransfers) : fn }))
	},
	setSpeed(fn) {
		set(state => ({ speed: typeof fn === "function" ? fn(state.speed) : fn }))
	},
	setRemaining(fn) {
		set(state => ({ remaining: typeof fn === "function" ? fn(state.remaining) : fn }))
	},
	setProgress(fn) {
		set(state => ({ progress: typeof fn === "function" ? fn(state.progress) : fn }))
	}
}))
