import { useLocalStorage } from "@uidotdev/usehooks"
import { FilenDesktopConfig } from "@filen/desktop/dist/types"
import { DEFAULT_DESKTOP_CONFIG } from "@/lib/setup"
import { DESKTOP_CONFIG_VERSION, SDK_CONFIG_VERSION } from "@/constants"

export const localStorageKey = `desktopConfig:${DESKTOP_CONFIG_VERSION}:${SDK_CONFIG_VERSION}`

export function getDesktopConfig(): FilenDesktopConfig {
	const desktopConfig = window.localStorage.getItem(localStorageKey)

	if (!desktopConfig) {
		return DEFAULT_DESKTOP_CONFIG
	}

	return JSON.parse(desktopConfig)
}

export default function useDesktopConfig() {
	const desktopConfig = useLocalStorage<FilenDesktopConfig>(localStorageKey, DEFAULT_DESKTOP_CONFIG)

	return desktopConfig
}
