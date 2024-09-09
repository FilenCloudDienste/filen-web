import { create } from "zustand"

export type MountsStore = {
	enablingNetworkDrive: boolean
	enablingS3: boolean
	enablingWebDAV: boolean
	setEnablingNetworkDrive: (fn: boolean | ((prev: boolean) => boolean)) => void
	setEnablingS3: (fn: boolean | ((prev: boolean) => boolean)) => void
	setEnablingWebDAV: (fn: boolean | ((prev: boolean) => boolean)) => void
}

export const useMountsStore = create<MountsStore>(set => ({
	enablingNetworkDrive: false,
	enablingS3: false,
	enablingWebDAV: false,
	setEnablingNetworkDrive(fn) {
		set(state => ({ enablingNetworkDrive: typeof fn === "function" ? fn(state.enablingNetworkDrive) : fn }))
	},
	setEnablingS3(fn) {
		set(state => ({ enablingNetworkDrive: typeof fn === "function" ? fn(state.enablingNetworkDrive) : fn }))
	},
	setEnablingWebDAV(fn) {
		set(state => ({ enablingNetworkDrive: typeof fn === "function" ? fn(state.enablingNetworkDrive) : fn }))
	}
}))
