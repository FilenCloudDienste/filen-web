import FilenSDK, { type FilenSDKConfig, ANONYMOUS_SDK_CONFIG } from "@filen/sdk"

let sdk = new FilenSDK({
	...ANONYMOUS_SDK_CONFIG,
	connectToSocket: true,
	metadataCache: true
})

export function getSDK(): FilenSDK {
	return sdk
}

export function initSDK(config: FilenSDKConfig): void {
	sdk.init(config)
}

export function reinitSDK(config?: FilenSDKConfig): void {
	sdk = new FilenSDK(
		config
			? config
			: {
					...ANONYMOUS_SDK_CONFIG,
					connectToSocket: true,
					metadataCache: true
				}
	)
}
