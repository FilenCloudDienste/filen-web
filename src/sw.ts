import FilenSDK, { type FileEncryptionVersion } from "@filen/sdk"
import mimeTypes from "mime-types"
import fetchAdapter from "@vespaiach/axios-fetch-adapter"
import axios from "axios"

declare let self: ServiceWorkerGlobalScope

const sdk = new FilenSDK(
	{
		email: "anonymous",
		password: "anonymous",
		masterKeys: ["anonymous"],
		connectToSocket: false,
		metadataCache: true,
		twoFactorCode: "anonymous",
		publicKey: "anonymous",
		privateKey: "anonymous",
		apiKey: "anonymous",
		authVersion: 2,
		baseFolderUUID: "anonymous",
		userId: 1
	},
	undefined,
	axios.create({
		adapter: fetchAdapter
	})
)

const map = new Map<
	string,
	{
		url: string
		rs: ReadableStream
		headers: Record<string, string>
	}
>()

const WRITE = 0
const PULL = 0
const ERROR = 1
const ABORT = 1
const CLOSE = 2

class MessagePortSource implements UnderlyingSource {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public controller: ReadableStreamController<any> | null = null
	public port: MessagePort

	public constructor(port: MessagePort) {
		this.port = port
		this.port.onmessage = evt => this.onMessage(evt.data)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public start(controller: ReadableStreamController<any>): void {
		this.controller = controller
	}

	public pull(): void {
		this.port.postMessage({
			type: PULL
		})
	}

	public cancel(reason?: Error): void {
		this.port.postMessage({
			type: ERROR,
			reason: reason?.message
		})

		this.port.close()
	}

	public onMessage(message?: { type: number; chunk: Uint8Array; reason?: Error }): void {
		if (!this.controller) {
			return
		}

		if (message?.type === WRITE) {
			this.controller.enqueue(message?.chunk)
		}

		if (message?.type === ABORT) {
			this.controller.error(message?.reason)
			this.port.close()
		}

		if (message?.type === CLOSE) {
			this.controller.close()
			this.port.close()
		}
	}
}

/**
 * Parse the requested byte range from the header.
 *
 * @param {string} range
 * @param {number} totalLength
 * @returns {({ start: number; end: number } | null)}
 */
function parseByteRange(range: string, totalLength: number): { start: number; end: number } | null {
	const [unit, rangeValue] = range.split("=")

	if (unit !== "bytes" || !rangeValue) {
		return null
	}

	const [startStr, endStr] = rangeValue.split("-")

	if (!startStr) {
		return null
	}

	const start = parseInt(startStr, 10)
	const end = endStr ? parseInt(endStr, 10) : totalLength - 1

	if (isNaN(start) || isNaN(end) || start < 0 || end >= totalLength || start > end) {
		return null
	}

	return {
		start,
		end
	}
}

function getStream(request: Request): Response {
	const searchParams = new URL(request.url).searchParams

	if (!searchParams.has("file")) {
		return new Response("404", {
			status: 404
		})
	}

	const fileBase64 = decodeURIComponent(searchParams.get("file")!)
	const file = JSON.parse(Buffer.from(fileBase64, "base64").toString("utf-8")) as {
		name: string
		mime: string
		size: number
		uuid: string
		bucket: string
		key: string
		version: FileEncryptionVersion
		chunks: number
		region: string
	}
	const mimeType = file.mime.length > 0 ? file.mime : mimeTypes.lookup(file.name) || "application/octet-stream"
	const totalLength = file.size
	const range =
		request.headers.get("range") ||
		request.headers.get("Range") ||
		request.headers.get("content-range") ||
		request.headers.get("Content-Range")
	let start = 0
	let end = totalLength - 1
	const responseHeaders = new Headers()
	let responseStatus = 200

	responseHeaders.set("Content-Type", mimeType)
	responseHeaders.set("Accept-Ranges", "bytes")
	// responseHeaders.set("Cache-Control", "no-store")
	// responseHeaders.delete("Connection")

	if (range) {
		const parsedRange = parseByteRange(range, totalLength)

		if (!parsedRange) {
			responseHeaders.set("Content-Length", "0")
			responseStatus = 400

			return new Response(responseStatus.toString(), {
				headers: responseHeaders,
				status: responseStatus
			})
		}

		start = parsedRange.start
		end = parsedRange.end
		responseStatus = 206
		responseHeaders.set("Content-Range", `bytes ${start}-${end}/${totalLength}`)
		responseHeaders.set("Content-Length", (end - start + 1).toString())
	} else {
		responseStatus = 200
		responseHeaders.set("Content-Length", file.size.toString())
	}

	const stream = sdk.cloud().downloadFileToReadableStream({
		uuid: file.uuid,
		bucket: file.bucket,
		region: file.region,
		version: file.version,
		key: file.key,
		size: file.size,
		chunks: file.chunks,
		start,
		end
	})

	request.signal.addEventListener("abort", () => {
		stream.cancel().catch(() => {})
	})

	return new Response(stream, {
		headers: responseHeaders,
		status: responseStatus
	})
}

self.addEventListener("install", () => {
	self.skipWaiting()
})

self.addEventListener("activate", event => {
	event.waitUntil(self.clients.claim())
})

self.addEventListener("message", e => {
	const data = e.data

	if (data.url && data.readablePort) {
		data.rs = new ReadableStream(
			new MessagePortSource(e.data.readablePort),
			new CountQueuingStrategy({
				highWaterMark: 4
			})
		)

		map.set(data.url, data)
	}
})

self.addEventListener("fetch", e => {
	try {
		const url = e.request.url
		const builtURL = new URL(url)

		if (builtURL.pathname === "/sw/ping") {
			e.respondWith(
				new Response("OK", {
					status: 200,
					headers: {
						"Content-Type": "text/plain; charset=UTF-8"
					}
				})
			)
		} else if (builtURL.pathname === "/sw/stream") {
			e.respondWith(getStream(e.request))
		} else {
			const data = map.get(url)

			if (!data) {
				return null
			}

			map.delete(url)

			e.respondWith(
				new Response(data.rs, {
					headers: data.headers
				})
			)
		}
	} catch (e) {
		console.error(e)

		return null
	}
})
