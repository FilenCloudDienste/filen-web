import streamSaver from "streamsaver"
import { sanitizeFileName } from "./utils"

export async function getStreamWriter({ name, size }: { name?: string; size?: number }): Promise<WritableStreamDefaultWriter<Buffer>>

export async function getStreamWriter({
	name,
	size,
	pipe
}: {
	name?: string
	size?: number
	pipe: boolean
}): Promise<WritableStream<Buffer>>

export async function getStreamWriter({
	name,
	size,
	pipe = false
}: {
	name?: string
	size?: number
	pipe?: boolean
}): Promise<WritableStream<Buffer> | WritableStreamDefaultWriter<Buffer>> {
	name = name ? name : `Download_${Date.now()}`

	const streamHandle = streamSaver.createWriteStream(sanitizeFileName(name), {
		size,
		pathname: `/download/${encodeURIComponent(sanitizeFileName(name))}`
		// streamsaver types its streams as Uint8Array; the app uses Buffer-typed byte streams.
	}) as unknown as WritableStream<Buffer>

	return !pipe ? streamHandle.getWriter() : streamHandle
}
