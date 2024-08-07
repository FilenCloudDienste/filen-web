import FilenSDK, { type FilenSDKConfig } from "@filen/sdk"

let sdk = new FilenSDK({
	email: "anonymous",
	password: "anonymous",
	masterKeys: ["anonymous"],
	connectToSocket: true,
	metadataCache: true,
	twoFactorCode: "anonymous",
	publicKey: "anonymous",
	privateKey: "anonymous",
	apiKey: "anonymous",
	authVersion: 2,
	baseFolderUUID: "anonymous",
	userId: 1
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
					email: "anonymous",
					password: "anonymous",
					masterKeys: ["anonymous"],
					connectToSocket: true,
					metadataCache: true,
					twoFactorCode: "anonymous",
					publicKey: "anonymous",
					privateKey: "anonymous",
					apiKey: "anonymous",
					authVersion: 2,
					baseFolderUUID: "anonymous",
					userId: 1
				}
	)
}
