import { create } from "zustand"

export type MountsStore = {
	enablingVirtualDrive: boolean
	enablingS3: boolean
	enablingWebDAV: boolean
	setEnablingVirtualDrive: (fn: boolean | ((prev: boolean) => boolean)) => void
	setEnablingS3: (fn: boolean | ((prev: boolean) => boolean)) => void
	setEnablingWebDAV: (fn: boolean | ((prev: boolean) => boolean)) => void
}

export const useMountsStore = create<MountsStore>(set => ({
	enablingVirtualDrive: false,
	enablingS3: false,
	enablingWebDAV: false,
	setEnablingVirtualDrive(fn) {
		set(state => ({ enablingVirtualDrive: typeof fn === "function" ? fn(state.enablingVirtualDrive) : fn }))
	},
	setEnablingS3(fn) {
		set(state => ({ enablingVirtualDrive: typeof fn === "function" ? fn(state.enablingVirtualDrive) : fn }))
	},
	setEnablingWebDAV(fn) {
		set(state => ({ enablingVirtualDrive: typeof fn === "function" ? fn(state.enablingVirtualDrive) : fn }))
	}
}))
