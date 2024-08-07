import { type FilenSDKConfig } from "@filen/sdk"
import { useLocalStorage } from "@uidotdev/usehooks"
import { DEFAULT_SDK_CONFIG } from "@/lib/setup"
import { SDK_CONFIG_VERSION } from "@/constants"

export type UseSDKConfig = Required<FilenSDKConfig>

export const localStorageKey = `sdkConfig:${SDK_CONFIG_VERSION}`

export function getSDKConfig(): FilenSDKConfig {
	const sdkConfig = window.localStorage.getItem(localStorageKey)

	if (!sdkConfig) {
		return DEFAULT_SDK_CONFIG
	}

	return JSON.parse(sdkConfig)
}

export default function useSDKConfig(): UseSDKConfig {
	const [sdkConfig] = useLocalStorage<Required<FilenSDKConfig>>(localStorageKey, DEFAULT_SDK_CONFIG as Required<FilenSDKConfig>)

	return {
		...sdkConfig,
		password: ""
	}
}
