import { create } from "zustand"
import { type RemoteConfig } from "@/types"

export type RemoteConfigStore = {
	config: RemoteConfig | null
	setConfig: (fn: RemoteConfig | null | ((prev: RemoteConfig | null) => RemoteConfig | null)) => void
}

export const useRemoteConfigStore = create<RemoteConfigStore>(set => ({
	config: null,
	setConfig(fn) {
		set(state => ({ config: typeof fn === "function" ? fn(state.config) : fn }))
	}
}))
