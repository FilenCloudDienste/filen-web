import { SDK_WORKER_THREADS } from "@/constants"
import { type SDKWorker, type FilenSDKConfig } from "@filen/sdk"
import { transfer, proxy } from "comlink"
import eventEmitter from "../eventEmitter"

export type WrappedSDKWorker = SDKWorker & { terminate: () => Promise<void> }

let sdkWorkers: WrappedSDKWorker[] = []

export async function initializeSDKWorker(config: FilenSDKConfig): Promise<void> {
	const sdkWorker = new ComlinkWorker<typeof import("./sdkWorker")>(new URL("./sdkWorker", import.meta.url), {
		type: "module"
	})

	await sdkWorker.initializeSDK(config)

	const worker: WrappedSDKWorker & { terminate: () => Promise<void> } = {
		async terminate() {
			return await sdkWorker.terminate()
		},
		crypto: {
			utils: {
				async bufferToHash(params) {
					return await sdkWorker.crypto_utils_bufferToHash(params)
				},
				async generatePasswordAndMasterKeyBasedOnAuthVersion(params) {
					return await sdkWorker.crypto_utils_generatePasswordAndMasterKeyBasedOnAuthVersion(params)
				},
				async generateKeyPair() {
					return await sdkWorker.crypto_utils_generateKeyPair()
				},
				async generateRandomString(params) {
					return await sdkWorker.crypto_utils_generateRandomString(params)
				},
				async derKeyToPem(params) {
					return await sdkWorker.crypto_utils_derKeyToPem(params)
				},
				// @ts-expect-error Overloads
				async deriveKeyFromPassword(params) {
					// @ts-expect-error Overloads
					return await sdkWorker.crypto_utils_deriveKeyFromPassword(params)
				},
				async hashFn(params) {
					return await sdkWorker.crypto_utils_hashFn(params)
				},
				async hashPassword(params) {
					return await sdkWorker.crypto_utils_hashPassword(params)
				},
				async importPBKDF2Key(params) {
					return await sdkWorker.crypto_utils_importPBKDF2Key(params)
				},
				async importPrivateKey(params) {
					return await sdkWorker.crypto_utils_importPrivateKey(params)
				},
				async importPublicKey(params) {
					return await sdkWorker.crypto_utils_importPublicKey(params)
				},
				async importRawKey(params) {
					return await sdkWorker.crypto_utils_importRawKey(params)
				},
				async generateEncryptionKey(params) {
					return await sdkWorker.crypto_utils_generateEncryptionKey(params)
				},
				async generateRandomBytes(params) {
					return await sdkWorker.crypto_utils_generateRandomBytes(params)
				},
				async hashFileName(params) {
					return await sdkWorker.crypto_utils_hashFileName(params)
				},
				async generatePrivateKeyHMAC(params) {
					return await sdkWorker.crypto_utils_generatePrivateKeyHMAC(params)
				},
				async generateRandomURLSafeString(params) {
					return await sdkWorker.crypto_utils_generateRandomURLSafeString(params)
				},
				async generateSearchIndexHashes(params) {
					return await sdkWorker.crypto_utils_generateSearchIndexHashes(params)
				},
				async hashSearchIndex(params) {
					return await sdkWorker.crypto_utils_hashSearchIndex(params)
				},
				async generateRandomHexString(params) {
					return await sdkWorker.crypto_utils_generateRandomHexString(params)
				}
			},
			encrypt: {
				async metadata(params) {
					return await sdkWorker.crypto_encrypt_metadata(params)
				},
				async metadataPublic(params) {
					return await sdkWorker.crypto_encrypt_metadataPublic(params)
				},
				async chatMessage(params) {
					return await sdkWorker.crypto_encrypt_chatMessage(params)
				},
				async chatConversationName(params) {
					return await sdkWorker.crypto_encrypt_chatConversationName(params)
				},
				async data(params) {
					return await sdkWorker.crypto_encrypt_data(transfer(params, [params.data.buffer]))
				},
				async dataStream(params) {
					return await sdkWorker.crypto_encrypt_dataStream(params)
				},
				async noteContent(params) {
					return await sdkWorker.crypto_encrypt_noteContent(params)
				},
				async notePreview(params) {
					return await sdkWorker.crypto_encrypt_notePreview(params)
				},
				async noteTagName(params) {
					return await sdkWorker.crypto_encrypt_noteTagName(params)
				},
				async noteTitle(params) {
					return await sdkWorker.crypto_encrypt_noteTitle(params)
				}
			},
			decrypt: {
				async metadata(params) {
					return await sdkWorker.crypto_decrypt_metadata(params)
				},
				async metadataPrivate(params) {
					return await sdkWorker.crypto_decrypt_metadataPrivate(params)
				},
				async chatMessage(params) {
					return await sdkWorker.crypto_decrypt_chatMessage(params)
				},
				async fileMetadata(params) {
					return await sdkWorker.crypto_decrypt_fileMetadata(params)
				},
				async fileMetadataLink(params) {
					return await sdkWorker.crypto_decrypt_fileMetadataLink(params)
				},
				async fileMetadataPrivate(params) {
					return await sdkWorker.crypto_decrypt_fileMetadataPrivate(params)
				},
				async folderMetadata(params) {
					return await sdkWorker.crypto_decrypt_folderMetadata(params)
				},
				async folderMetadataLink(params) {
					return await sdkWorker.crypto_decrypt_folderMetadataLink(params)
				},
				async folderMetadataPrivate(params) {
					return await sdkWorker.crypto_decrypt_folderMetadataPrivate(params)
				},
				async chatConversationName(params) {
					return await sdkWorker.crypto_decrypt_chatConversationName(params)
				},
				async chatKeyOwner(params) {
					return await sdkWorker.crypto_decrypt_chatKeyOwner(params)
				},
				async chatKeyParticipant(params) {
					return await sdkWorker.crypto_decrypt_chatKeyParticipant(params)
				},
				async noteContent(params) {
					return await sdkWorker.crypto_decrypt_noteContent(params)
				},
				async noteKeyOwner(params) {
					return await sdkWorker.crypto_decrypt_noteKeyOwner(params)
				},
				async noteKeyParticipant(params) {
					return await sdkWorker.crypto_decrypt_noteKeyParticipant(params)
				},
				async notePreview(params) {
					return await sdkWorker.crypto_decrypt_notePreview(params)
				},
				async noteTagName(params) {
					return await sdkWorker.crypto_decrypt_noteTagName(params)
				},
				async noteTitle(params) {
					return await sdkWorker.crypto_decrypt_noteTitle(params)
				},
				async folderLinkKey(params) {
					return await sdkWorker.crypto_decrypt_folderLinkKey(params)
				},
				async data(params) {
					return await sdkWorker.crypto_decrypt_data(transfer(params, [params.data.buffer]))
				},
				async dataStream(params) {
					return await sdkWorker.crypto_decrypt_dataStream(params)
				},
				async event(params) {
					return await sdkWorker.crypto_decrypt_event(params)
				}
			}
		},
		api: {
			v3: {
				file: {
					upload: {
						chunk: {
							buffer: {
								async fetch(params) {
									delete params.abortSignal
									delete params.onProgress

									return await sdkWorker.api_v3_file_upload_chunk_buffer(transfer(params, [params.buffer.buffer]))
								}
							}
						}
					},
					download: {
						chunk: {
							buffer: {
								async fetch(params) {
									delete params.abortSignal
									delete params.onProgress

									return await sdkWorker.api_v3_file_download_chunk_buffer(params)
								}
							}
						}
					}
				}
			}
		}
	}

	sdkWorker.setMessageHandler(proxy(event => eventEmitter.emit("sdkWorkerMessage", event)))

	sdkWorkers.push(worker)
}

export async function initializeSDKWorkers(config: FilenSDKConfig): Promise<SDKWorker[] | undefined> {
	for (const sdkWorker of sdkWorkers) {
		await sdkWorker.terminate()
	}

	sdkWorkers = []

	if (config.apiKey && config.apiKey.length >= 16 && config.masterKeys && config.masterKeys.length > 0 && config.apiKey !== "anonymous") {
		await Promise.all(
			new Array(SDK_WORKER_THREADS).fill(0).map(
				async () =>
					await initializeSDKWorker({
						...config,
						connectToSocket: false
					})
			)
		)
	}

	return getSDKWorkers()
}

export function getSDKWorkers(): SDKWorker[] | undefined {
	return sdkWorkers.length > 0 ? sdkWorkers : undefined
}
