import { getSDK } from "../sdk"
import { type FilenSDKConfig, type SDKWorker, PauseSignal } from "@filen/sdk"
import { transfer } from "comlink"
import eventEmitter from "../eventEmitter"

export type SDKWorkerToMainWorkerMessage =
	| {
			type: "uploadProgress"
			data: {
				uuid: string
				bytes: number
				name: string
				fileType: "file" | "directory"
			}
	  }
	| {
			type: "downloadProgress"
			data: {
				uuid: string
				bytes: number
				name: string
				fileType: "file" | "directory"
			}
	  }

let isInitialized = false
const pauseSignals: Record<string, PauseSignal> = {}
const abortControllers: Record<string, AbortController> = {}

export let postMessageToMain: (message: SDKWorkerToMainWorkerMessage) => void = message => eventEmitter.emit("sdkWorkerMessage", message)

export async function setMessageHandler(callback: (message: SDKWorkerToMainWorkerMessage) => void): Promise<void> {
	postMessageToMain = callback

	return
}

export async function waitForInitialization(): Promise<void> {
	// Only check for init if we are running inside a WebWorker.
	if (isInitialized || !(typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope)) {
		return
	}

	await new Promise<void>(resolve => {
		const wait = setInterval(() => {
			if (isInitialized) {
				clearInterval(wait)

				resolve()
			}
		}, 10)
	})
}

export async function initializeSDK(config: FilenSDKConfig): Promise<void> {
	getSDK().init(config)

	console.log("SDKWorker SDK initialized")

	console.log(config)

	isInitialized = true
}

export async function pausePauseSignal({ id }: { id: string }): Promise<void> {
	await waitForInitialization()

	if (!pauseSignals[id] || pauseSignals[id]!.isPaused()) {
		return
	}

	pauseSignals[id]!.pause()
}

export async function resumePauseSignal({ id }: { id: string }): Promise<void> {
	await waitForInitialization()

	if (!pauseSignals[id] || !pauseSignals[id]!.isPaused()) {
		return
	}

	pauseSignals[id]!.resume()
}

export async function abortAbortSignal({ id }: { id: string }): Promise<void> {
	await waitForInitialization()

	if (!abortControllers[id] || abortControllers[id]!.signal.aborted) {
		return
	}

	abortControllers[id]!.abort()

	delete abortControllers[id]
	delete pauseSignals[id]
}

export const sdkWorker: SDKWorker = {
	crypto: {
		utils: {
			async bufferToHash(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.bufferToHash(params)
			},
			async generatePasswordAndMasterKeyBasedOnAuthVersion(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generatePasswordAndMasterKeyBasedOnAuthVersion(params)
			},
			async generateKeyPair() {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateKeyPair()
			},
			async generateRandomString(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateRandomString(params)
			},
			async generateEncryptionKey(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateEncryptionKey(params)
			},
			async generateRandomBytes(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateRandomBytes(params)
			},
			async hashFileName(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.hashFileName(params)
			},
			async generatePrivateKeyHMAC(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generatePrivateKeyHMAC(params)
			},
			async generateRandomURLSafeString(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateRandomURLSafeString(params)
			},
			async generateSearchIndexHashes(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateSearchIndexHashes(params)
			},
			async hashSearchIndex(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.hashSearchIndex(params)
			},
			async generateRandomHexString(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.generateRandomHexString(params)
			},
			async derKeyToPem(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.derKeyToPem(params)
			},
			async deriveKeyFromPassword(params) {
				await waitForInitialization()

				return await getSDK()
					.crypto()
					// @ts-expect-error Overloads
					.utils.deriveKeyFromPassword(params)
			},
			async hashFn(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.hashFn(params)
			},
			async hashPassword(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.hashPassword(params)
			},
			async importPBKDF2Key(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.importPBKDF2Key(params)
			},
			async importPrivateKey(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.importPrivateKey(params)
			},
			async importPublicKey(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.importPublicKey(params)
			},
			async importRawKey(params) {
				await waitForInitialization()

				return await getSDK().crypto().utils.importRawKey(params)
			}
		},
		encrypt: {
			async metadata(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().metadata(params)
			},
			async metadataPublic(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().metadataPublic(params)
			},
			async chatMessage(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().chatMessage(params)
			},
			async chatConversationName(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().chatConversationName(params)
			},
			async data(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().data(params)
			},
			async dataStream(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().dataStream(params)
			},
			async noteContent(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().noteContent(params)
			},
			async notePreview(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().notePreview(params)
			},
			async noteTagName(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().noteTagName(params)
			},
			async noteTitle(params) {
				await waitForInitialization()

				return await getSDK().crypto().encrypt().noteTitle(params)
			}
		},
		decrypt: {
			async metadata(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().metadata(params)
			},
			async metadataPrivate(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().metadataPrivate(params)
			},
			async chatMessage(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().chatMessage(params)
			},
			async fileMetadata(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().fileMetadata(params)
			},
			async fileMetadataLink(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().fileMetadataLink(params)
			},
			async fileMetadataPrivate(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().fileMetadataPrivate(params)
			},
			async folderMetadata(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().folderMetadata(params)
			},
			async folderMetadataLink(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().folderMetadataLink(params)
			},
			async folderMetadataPrivate(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().folderMetadataPrivate(params)
			},
			async chatConversationName(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().chatConversationName(params)
			},
			async chatKeyOwner(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().chatKeyOwner(params)
			},
			async chatKeyParticipant(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().chatKeyParticipant(params)
			},
			async noteContent(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().noteContent(params)
			},
			async noteKeyOwner(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().noteKeyOwner(params)
			},
			async noteKeyParticipant(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().noteKeyParticipant(params)
			},
			async notePreview(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().notePreview(params)
			},
			async noteTagName(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().noteTagName(params)
			},
			async noteTitle(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().noteTitle(params)
			},
			async folderLinkKey(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().folderLinkKey(params)
			},
			async data(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().data(params)
			},
			async dataStream(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().dataStream(params)
			},
			async event(params) {
				await waitForInitialization()

				return await getSDK().crypto().decrypt().event(params)
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
								await waitForInitialization()

								params.onProgress = bytes => {
									postMessageToMain({
										type: "uploadProgress",
										data: {
											uuid: params.onProgressId ? params.onProgressId : params.uuid,
											bytes,
											name: "",
											fileType: "file"
										}
									})
								}

								return await getSDK().api(3).file().upload().chunk().buffer(params)
							}
						}
					}
				},
				download: {
					chunk: {
						buffer: {
							async fetch(params) {
								await waitForInitialization()

								/*params.onProgress = bytes => {
									postMessageToMain({
										type: "downloadProgress",
										data: {
											uuid: params.onProgressId ? params.onProgressId : params.uuid,
											bytes,
											name: ""
										}
									})
								}*/

								return await getSDK().api(3).file().download().chunk().buffer(params)
							}
						}
					}
				}
			}
		}
	}
}

export async function crypto_utils_bufferToHash(...params: Parameters<typeof sdkWorker.crypto.utils.bufferToHash>) {
	return await sdkWorker.crypto.utils.bufferToHash(...params)
}

export async function crypto_utils_generatePasswordAndMasterKeyBasedOnAuthVersion(
	...params: Parameters<typeof sdkWorker.crypto.utils.generatePasswordAndMasterKeyBasedOnAuthVersion>
) {
	return await sdkWorker.crypto.utils.generatePasswordAndMasterKeyBasedOnAuthVersion(...params)
}

export async function crypto_utils_generateKeyPair(...params: Parameters<typeof sdkWorker.crypto.utils.generateKeyPair>) {
	return await sdkWorker.crypto.utils.generateKeyPair(...params)
}

export async function crypto_utils_generateRandomString(...params: Parameters<typeof sdkWorker.crypto.utils.generateRandomString>) {
	return await sdkWorker.crypto.utils.generateRandomString(...params)
}

export async function crypto_utils_derKeyToPem(...params: Parameters<typeof sdkWorker.crypto.utils.derKeyToPem>) {
	return await sdkWorker.crypto.utils.derKeyToPem(...params)
}

export async function crypto_utils_deriveKeyFromPassword(...params: Parameters<typeof sdkWorker.crypto.utils.deriveKeyFromPassword>) {
	const result = await sdkWorker.crypto.utils.deriveKeyFromPassword(...params)

	return typeof result === "string" ? result : transfer(result, [(result as Buffer).buffer])
}

export async function crypto_utils_hashFn(...params: Parameters<typeof sdkWorker.crypto.utils.hashFn>) {
	return await sdkWorker.crypto.utils.hashFn(...params)
}

export async function crypto_utils_hashPassword(...params: Parameters<typeof sdkWorker.crypto.utils.hashPassword>) {
	return await sdkWorker.crypto.utils.hashPassword(...params)
}

export async function crypto_utils_importPBKDF2Key(...params: Parameters<typeof sdkWorker.crypto.utils.importPBKDF2Key>) {
	return await sdkWorker.crypto.utils.importPBKDF2Key(...params)
}

export async function crypto_utils_importPrivateKey(...params: Parameters<typeof sdkWorker.crypto.utils.importPrivateKey>) {
	return await sdkWorker.crypto.utils.importPrivateKey(...params)
}

export async function crypto_utils_importPublicKey(...params: Parameters<typeof sdkWorker.crypto.utils.importPublicKey>) {
	return await sdkWorker.crypto.utils.importPublicKey(...params)
}

export async function crypto_utils_importRawKey(...params: Parameters<typeof sdkWorker.crypto.utils.importRawKey>) {
	return await sdkWorker.crypto.utils.importRawKey(...params)
}

export async function crypto_encrypt_metadata(...params: Parameters<typeof sdkWorker.crypto.encrypt.metadata>) {
	return await sdkWorker.crypto.encrypt.metadata(...params)
}

export async function crypto_encrypt_metadataPublic(...params: Parameters<typeof sdkWorker.crypto.encrypt.metadataPublic>) {
	return await sdkWorker.crypto.encrypt.metadataPublic(...params)
}

export async function crypto_encrypt_chatMessage(...params: Parameters<typeof sdkWorker.crypto.encrypt.chatMessage>) {
	return await sdkWorker.crypto.encrypt.chatMessage(...params)
}

export async function crypto_encrypt_chatConversationName(...params: Parameters<typeof sdkWorker.crypto.encrypt.chatConversationName>) {
	return await sdkWorker.crypto.encrypt.chatConversationName(...params)
}

export async function crypto_encrypt_data(...params: Parameters<typeof sdkWorker.crypto.encrypt.data>) {
	const result = await sdkWorker.crypto.encrypt.data(...params)

	return transfer(result, [result.buffer])
}

export async function crypto_encrypt_dataStream(...params: Parameters<typeof sdkWorker.crypto.encrypt.dataStream>) {
	return await sdkWorker.crypto.encrypt.dataStream(...params)
}

export async function crypto_encrypt_noteContent(...params: Parameters<typeof sdkWorker.crypto.encrypt.noteContent>) {
	return await sdkWorker.crypto.encrypt.noteContent(...params)
}

export async function crypto_encrypt_notePreview(...params: Parameters<typeof sdkWorker.crypto.encrypt.notePreview>) {
	return await sdkWorker.crypto.encrypt.notePreview(...params)
}

export async function crypto_encrypt_noteTagName(...params: Parameters<typeof sdkWorker.crypto.encrypt.noteTagName>) {
	return await sdkWorker.crypto.encrypt.noteTagName(...params)
}

export async function crypto_encrypt_noteTitle(...params: Parameters<typeof sdkWorker.crypto.encrypt.noteTitle>) {
	return await sdkWorker.crypto.encrypt.noteTitle(...params)
}

export async function crypto_decrypt_metadata(...params: Parameters<typeof sdkWorker.crypto.decrypt.metadata>) {
	return await sdkWorker.crypto.decrypt.metadata(...params)
}

export async function crypto_decrypt_metadataPrivate(...params: Parameters<typeof sdkWorker.crypto.decrypt.metadataPrivate>) {
	return await sdkWorker.crypto.decrypt.metadataPrivate(...params)
}

export async function crypto_decrypt_chatMessage(...params: Parameters<typeof sdkWorker.crypto.decrypt.chatMessage>) {
	return await sdkWorker.crypto.decrypt.chatMessage(...params)
}

export async function crypto_decrypt_fileMetadata(...params: Parameters<typeof sdkWorker.crypto.decrypt.fileMetadata>) {
	return await sdkWorker.crypto.decrypt.fileMetadata(...params)
}

export async function crypto_decrypt_fileMetadataLink(...params: Parameters<typeof sdkWorker.crypto.decrypt.fileMetadataLink>) {
	return await sdkWorker.crypto.decrypt.fileMetadataLink(...params)
}

export async function crypto_decrypt_fileMetadataPrivate(...params: Parameters<typeof sdkWorker.crypto.decrypt.fileMetadataPrivate>) {
	return await sdkWorker.crypto.decrypt.fileMetadataPrivate(...params)
}

export async function crypto_decrypt_folderMetadata(...params: Parameters<typeof sdkWorker.crypto.decrypt.folderMetadata>) {
	return await sdkWorker.crypto.decrypt.folderMetadata(...params)
}

export async function crypto_decrypt_folderMetadataLink(...params: Parameters<typeof sdkWorker.crypto.decrypt.folderMetadataLink>) {
	return await sdkWorker.crypto.decrypt.folderMetadataLink(...params)
}

export async function crypto_decrypt_folderMetadataPrivate(...params: Parameters<typeof sdkWorker.crypto.decrypt.folderMetadataPrivate>) {
	return await sdkWorker.crypto.decrypt.folderMetadataPrivate(...params)
}

export async function crypto_decrypt_chatConversationName(...params: Parameters<typeof sdkWorker.crypto.decrypt.chatConversationName>) {
	return await sdkWorker.crypto.decrypt.chatConversationName(...params)
}

export async function crypto_decrypt_chatKeyOwner(...params: Parameters<typeof sdkWorker.crypto.decrypt.chatKeyOwner>) {
	return await sdkWorker.crypto.decrypt.chatKeyOwner(...params)
}

export async function crypto_decrypt_chatKeyParticipant(...params: Parameters<typeof sdkWorker.crypto.decrypt.chatKeyParticipant>) {
	return await sdkWorker.crypto.decrypt.chatKeyParticipant(...params)
}
export async function crypto_decrypt_noteContent(...params: Parameters<typeof sdkWorker.crypto.decrypt.noteContent>) {
	return await sdkWorker.crypto.decrypt.noteContent(...params)
}

export async function crypto_decrypt_noteKeyOwner(...params: Parameters<typeof sdkWorker.crypto.decrypt.noteKeyOwner>) {
	return await sdkWorker.crypto.decrypt.noteKeyOwner(...params)
}

export async function crypto_decrypt_noteKeyParticipant(...params: Parameters<typeof sdkWorker.crypto.decrypt.noteKeyParticipant>) {
	return await sdkWorker.crypto.decrypt.noteKeyParticipant(...params)
}

export async function crypto_decrypt_notePreview(...params: Parameters<typeof sdkWorker.crypto.decrypt.notePreview>) {
	return await sdkWorker.crypto.decrypt.notePreview(...params)
}

export async function crypto_decrypt_noteTagName(...params: Parameters<typeof sdkWorker.crypto.decrypt.noteTagName>) {
	return await sdkWorker.crypto.decrypt.noteTagName(...params)
}

export async function crypto_decrypt_noteTitle(...params: Parameters<typeof sdkWorker.crypto.decrypt.noteTitle>) {
	return await sdkWorker.crypto.decrypt.noteTitle(...params)
}
export async function crypto_decrypt_folderLinkKey(...params: Parameters<typeof sdkWorker.crypto.decrypt.folderLinkKey>) {
	return await sdkWorker.crypto.decrypt.folderLinkKey(...params)
}

export async function crypto_decrypt_data(...params: Parameters<typeof sdkWorker.crypto.decrypt.data>) {
	const result = await sdkWorker.crypto.decrypt.data(...params)

	return transfer(result, [result.buffer])
}

export async function crypto_decrypt_dataStream(...params: Parameters<typeof sdkWorker.crypto.decrypt.dataStream>) {
	return await sdkWorker.crypto.decrypt.dataStream(...params)
}

export async function crypto_decrypt_event(...params: Parameters<typeof sdkWorker.crypto.decrypt.event>) {
	return await sdkWorker.crypto.decrypt.event(...params)
}

export async function api_v3_file_upload_chunk_buffer(...params: Parameters<typeof sdkWorker.api.v3.file.upload.chunk.buffer.fetch>) {
	return await sdkWorker.api.v3.file.upload.chunk.buffer.fetch(...params)
}

export async function api_v3_file_download_chunk_buffer(...params: Parameters<typeof sdkWorker.api.v3.file.download.chunk.buffer.fetch>) {
	const result = await sdkWorker.api.v3.file.download.chunk.buffer.fetch(...params)

	return transfer(result, [result.buffer])
}

export async function terminate(): Promise<void> {
	self.close()
}

export async function crypto_utils_generateEncryptionKey(...params: Parameters<typeof sdkWorker.crypto.utils.generateEncryptionKey>) {
	return await sdkWorker.crypto.utils.generateEncryptionKey(...params)
}

export async function crypto_utils_generateRandomBytes(...params: Parameters<typeof sdkWorker.crypto.utils.generateRandomBytes>) {
	const result = await sdkWorker.crypto.utils.generateRandomBytes(...params)

	return transfer(result, [result.buffer])
}

export async function crypto_utils_hashFileName(...params: Parameters<typeof sdkWorker.crypto.utils.hashFileName>) {
	return await sdkWorker.crypto.utils.hashFileName(...params)
}

export async function crypto_utils_generatePrivateKeyHMAC(...params: Parameters<typeof sdkWorker.crypto.utils.generatePrivateKeyHMAC>) {
	const result = await sdkWorker.crypto.utils.generatePrivateKeyHMAC(...params)

	return transfer(result, [result.buffer])
}

export async function crypto_utils_generateRandomURLSafeString(
	...params: Parameters<typeof sdkWorker.crypto.utils.generateRandomURLSafeString>
) {
	return await sdkWorker.crypto.utils.generateRandomURLSafeString(...params)
}

export async function crypto_utils_generateSearchIndexHashes(
	...params: Parameters<typeof sdkWorker.crypto.utils.generateSearchIndexHashes>
) {
	return await sdkWorker.crypto.utils.generateSearchIndexHashes(...params)
}

export async function crypto_utils_hashSearchIndex(...params: Parameters<typeof sdkWorker.crypto.utils.hashSearchIndex>) {
	return await sdkWorker.crypto.utils.hashSearchIndex(...params)
}

export async function crypto_utils_generateRandomHexString(...params: Parameters<typeof sdkWorker.crypto.utils.generateRandomHexString>) {
	return await sdkWorker.crypto.utils.generateRandomHexString(...params)
}
