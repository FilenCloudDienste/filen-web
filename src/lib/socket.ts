import SDK from "./sdk"

export const socket = SDK.socket

export async function connect({ apiKey }: { apiKey: string }): Promise<void> {
	socket.connect({ apiKey })
}

export default socket
