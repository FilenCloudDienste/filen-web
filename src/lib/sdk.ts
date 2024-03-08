import FilenSDK from "@filen/sdk"

export const sdk = new FilenSDK({
	metadataCache: true,
	connectToSocket: true
})

console.log(sdk)

export default sdk
