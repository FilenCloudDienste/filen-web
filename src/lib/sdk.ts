import FilenSDK from "@filen/sdk"

const sdk = new FilenSDK({
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

export default sdk
