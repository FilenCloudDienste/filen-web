import { type FilenSDKConfig, ANONYMOUS_SDK_CONFIG } from "@filen/sdk"
import { useLocalStorage } from "@uidotdev/usehooks"
import { SDK_CONFIG_VERSION, DESKTOP_CONFIG_VERSION } from "@/constants"

export type UseSDKConfig = Required<FilenSDKConfig>

export const localStorageKey = `sdkConfig:${SDK_CONFIG_VERSION}:${DESKTOP_CONFIG_VERSION}`

export function getSDKConfig(): FilenSDKConfig {
	const sdkConfig = window.localStorage.getItem(localStorageKey)

	if (!sdkConfig) {
		return {
			...ANONYMOUS_SDK_CONFIG,
			connectToSocket: true,
			metadataCache: true
		}
	}

	return JSON.parse(sdkConfig)
}

export default function useSDKConfig(): UseSDKConfig {
	const [sdkConfig] = useLocalStorage<Required<FilenSDKConfig>>(localStorageKey, {
		...ANONYMOUS_SDK_CONFIG,
		connectToSocket: true,
		metadataCache: true
	} as Required<FilenSDKConfig>)

	return {
		...sdkConfig,
		password: ""
	}
}
