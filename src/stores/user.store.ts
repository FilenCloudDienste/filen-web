import { create } from "zustand"
import { type UserAccountResponse } from "@filen/sdk/dist/types/api/v3/user/account"
import { type UserSettingsResponse } from "@filen/sdk/dist/types/api/v3/user/settings"

export type UserStore = {
	account: UserAccountResponse | null
	settings: UserSettingsResponse | null
	setAccount: (fn: UserAccountResponse | null | ((prev: UserAccountResponse | null) => UserAccountResponse | null)) => void
	setSettings: (fn: UserSettingsResponse | null | ((prev: UserSettingsResponse | null) => UserSettingsResponse | null)) => void
}

export const useUserStore = create<UserStore>(set => ({
	account: null,
	settings: null,
	setAccount(fn) {
		set(state => ({ account: typeof fn === "function" ? fn(state.account) : fn }))
	},
	setSettings(fn) {
		set(state => ({ settings: typeof fn === "function" ? fn(state.settings) : fn }))
	}
}))
