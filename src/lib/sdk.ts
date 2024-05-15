import FilenSDK from "@filen/sdk"

export const sdk = new FilenSDK({
	metadataCache: true,
	connectToSocket: false
})

export default sdk
