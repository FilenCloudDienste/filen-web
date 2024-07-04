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
	setSelectedSync: (fn: SyncPair | null | ((prev: SyncPair | null) => SyncPair | null)) => void
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
}

export const useSyncsStore = create<SyncsStore>(set => ({
	selectedSync: null,
	transferEvents: {},
	cycleState: {},
	transfers: {},
	remoteIgnored: {},
	localIgnored: {},
	errors: {},
	taskErrors: {},
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
	}
}))
