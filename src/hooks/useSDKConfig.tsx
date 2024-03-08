import { type FilenSDKConfig } from "@filen/sdk"
import { useLocalStorage } from "@uidotdev/usehooks"

export type UseSDKConfig = Required<FilenSDKConfig>

export default function useSDKConfig(): UseSDKConfig {
	const [sdkConfig] = useLocalStorage<Required<FilenSDKConfig>>("sdkConfig")

	if (!sdkConfig) {
		throw new Error("SDK Config undefined")
	}

	return sdkConfig
}
