import SDK from "../sdk"
import { FilenSDKConfig } from "@filen/sdk"

export async function initializeSDK({ config }: { config: FilenSDKConfig }): Promise<void> {
	SDK.init(config)
}

export async function encryptMetadata({ metadata, key, derive }: { metadata: string; key?: string; derive?: boolean }) {
	return await SDK.crypto().encrypt().metadata({ metadata, key, derive })
}

export async function decryptMetadata({ metadata, key }: { metadata: string; key: string }) {
	return await SDK.crypto().decrypt().metadata({ metadata, key })
}

export async function readdir({ path, recursive }: { path: string; recursive?: boolean }) {
	return await SDK.fs().readdir({ path, recursive })
}
