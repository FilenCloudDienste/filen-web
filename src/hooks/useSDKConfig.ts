import { type FilenSDKConfig } from "@filen/sdk"
import { useLocalStorage } from "@uidotdev/usehooks"
import { DEFAULT_SDK_CONFIG } from "@/lib/setup"

export type UseSDKConfig = Required<FilenSDKConfig>

export default function useSDKConfig(): UseSDKConfig {
	const [sdkConfig] = useLocalStorage<Required<FilenSDKConfig>>("sdkConfig", DEFAULT_SDK_CONFIG as Required<FilenSDKConfig>)

	return {
		...sdkConfig,
		password: ""
	}
}
