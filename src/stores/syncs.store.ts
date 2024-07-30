import { create } from "zustand"
import { type SyncPair, type TransferData, type CycleState, type IPCTaskError } from "@filen/sync/dist/types"
import { type LocalTreeIgnored } from "@filen/sync/dist/lib/filesystems/local"
import { type RemoteTreeIgnored } from "@filen/sync/dist/lib/filesystems/remote"
import { type SerializedError } from "@filen/sync/dist/utils"

export type TransferState = "started" | "queued" | "finished" | "error" | "stopped" | "paused"

export type Transfer = {
	type: "upload" | "download"
	localPath: string
	relativePath: string
	state: TransferState
	bytes: number
	name: string
	size: number
	startedTimestamp: number
	finishedTimestamp: number
	queuedTimestamp: number
	errorTimestamp: number
	progressTimestamp: number
}

export type TransferDataWithTimestamp = TransferData & { timestamp: number }

export type GeneralError = {
	type: "cycle" | "general" | "localTree" | "transfer"
	error: SerializedError
}

export type SyncsStore = {
	selectedSync: SyncPair | null
	transferEvents: Record<string, TransferDataWithTimestamp[]>
	cycleState: Record<string, CycleState>
	transfers: Record<string, Transfer[]>
	remoteIgnored: Record<string, RemoteTreeIgnored[]>
	localIgnored: Record<string, LocalTreeIgnored[]>
	errors: Record<string, GeneralError[]>
	taskErrors: Record<string, IPCTaskError[]>
	search: string
	changing: boolean
	remainingReadable: Record<string, string>
	remaining: Record<string, number>
	speed: Record<string, number>
	progress: Record<string, number>
	setSelectedSync: (fn: SyncPair | null | ((prev: SyncPair | null) => SyncPair | null)) => void
	setChanging: (fn: boolean | ((prev: boolean) => boolean)) => void
	setTransferEvents: (
		fn:
			| Record<string, TransferDataWithTimestamp[]>
			| ((prev: Record<string, TransferDataWithTimestamp[]>) => Record<string, TransferDataWithTimestamp[]>)
	) => void
	setCycleState: (fn: Record<string, CycleState> | ((prev: Record<string, CycleState>) => Record<string, CycleState>)) => void
	setTransfers: (fn: Record<string, Transfer[]> | ((prev: Record<string, Transfer[]>) => Record<string, Transfer[]>)) => void
	setRemoteIgnored: (
		fn: Record<string, RemoteTreeIgnored[]> | ((prev: Record<string, RemoteTreeIgnored[]>) => Record<string, RemoteTreeIgnored[]>)
	) => void
	setLocalIgnored: (
		fn: Record<string, LocalTreeIgnored[]> | ((prev: Record<string, LocalTreeIgnored[]>) => Record<string, LocalTreeIgnored[]>)
	) => void
	setErrors: (fn: Record<string, GeneralError[]> | ((prev: Record<string, GeneralError[]>) => Record<string, GeneralError[]>)) => void
	setTaskErrors: (fn: Record<string, IPCTaskError[]> | ((prev: Record<string, IPCTaskError[]>) => Record<string, IPCTaskError[]>)) => void
	setSearch: (fn: string | ((prev: string) => string)) => void
	setRemainingReadable: (fn: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
	setRemaining: (fn: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
	setSpeed: (fn: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
	setProgress: (fn: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
}

export const useSyncsStore = create<SyncsStore>(set => ({
	selectedSync: null,
	transferEvents: {},
	cycleState: {},
	transfers: {
		/*"8e9b6c9b-50c2-4bad-9388-4194388c4597": [
			{
				type: "download",
				localPath: "C:\\Users\\dwynr\\lol.txt",
				relativePath: "/lol.txt",
				state: "started",
				bytes: 1,
				name: "lol.txt",
				size: 5,
				startedTimestamp: 0,
				finishedTimestamp: 0,
				queuedTimestamp: 0,
				errorTimestamp: 0,
				progressTimestamp: 0
			},
			{
				type: "download",
				localPath: "C:\\Users\\dwynr\\lol.txt",
				relativePath: "/lol.txt",
				state: "started",
				bytes: 3,
				name: "lol.txt",
				size: 5,
				startedTimestamp: 0,
				finishedTimestamp: 0,
				queuedTimestamp: 0,
				errorTimestamp: 0,
				progressTimestamp: 0
			}
		]*/
	},
	remoteIgnored: {},
	localIgnored: {},
	errors: {},
	taskErrors: {},
	search: "",
	changing: false,
	remainingReadable: {},
	speed: {},
	progress: {},
	remaining: {},
	setSelectedSync(fn) {
		set(state => ({ selectedSync: typeof fn === "function" ? fn(state.selectedSync) : fn }))
	},
	setTransferEvents(fn) {
		set(state => ({ transferEvents: typeof fn === "function" ? fn(state.transferEvents) : fn }))
	},
	setCycleState(fn) {
		set(state => ({ cycleState: typeof fn === "function" ? fn(state.cycleState) : fn }))
	},
	setTransfers(fn) {
		set(state => ({ transfers: typeof fn === "function" ? fn(state.transfers) : fn }))
	},
	setRemoteIgnored(fn) {
		set(state => ({ remoteIgnored: typeof fn === "function" ? fn(state.remoteIgnored) : fn }))
	},
	setLocalIgnored(fn) {
		set(state => ({ localIgnored: typeof fn === "function" ? fn(state.localIgnored) : fn }))
	},
	setErrors(fn) {
		set(state => ({ errors: typeof fn === "function" ? fn(state.errors) : fn }))
	},
	setTaskErrors(fn) {
		set(state => ({ taskErrors: typeof fn === "function" ? fn(state.taskErrors) : fn }))
	},
	setSearch(fn) {
		set(state => ({ search: typeof fn === "function" ? fn(state.search) : fn }))
	},
	setChanging(fn) {
		set(state => ({ changing: typeof fn === "function" ? fn(state.changing) : fn }))
	},
	setRemainingReadable(fn) {
		set(state => ({ remainingReadable: typeof fn === "function" ? fn(state.remainingReadable) : fn }))
	},
	setProgress(fn) {
		set(state => ({ progress: typeof fn === "function" ? fn(state.progress) : fn }))
	},
	setRemaining(fn) {
		set(state => ({ remaining: typeof fn === "function" ? fn(state.remaining) : fn }))
	},
	setSpeed(fn) {
		set(state => ({ speed: typeof fn === "function" ? fn(state.speed) : fn }))
	}
}))
