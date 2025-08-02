import FilenSDK, { type FileEncryptionVersion, ANONYMOUS_SDK_CONFIG } from "@filen/sdk"
import mimeTypes from "mime-types"
import fetchAdapter from "@vespaiach/axios-fetch-adapter"
import axios from "axios"

declare let self: ServiceWorkerGlobalScope

const sdk = new FilenSDK(
	{
		...ANONYMOUS_SDK_CONFIG,
		connectToSocket: false,
		metadataCache: true
	},
	undefined,
	axios.create({
		adapter: fetchAdapter
	})
)

const map = new Map()

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

	const isDownload = searchParams.has("download")
	const fileBase64 = decodeURIComponent(searchParams.get("file") ?? "")
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
	const responseHeaders = new Headers({
		"Content-Security-Policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
		"X-Content-Security-Policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
		"X-WebKit-CSP": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
		"X-XSS-Protection": "1; mode=block",
		"Cross-Origin-Embedder-Policy": "require-corp",
		"X-Content-Type-Options": "nosniff"
	})
	let responseStatus = 200

	responseHeaders.set("Content-Type", mimeType)

	if (!isDownload) {
		responseHeaders.set("Accept-Ranges", "bytes")
	} else {
		responseHeaders.set("Content-Disposition", `attachment; filename=${file.name}`)
	}

	// responseHeaders.set("Cache-Control", "no-store")
	// responseHeaders.delete("Connection")

	if (range && !isDownload) {
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

function createStream(port: MessagePort) {
	return new ReadableStream({
		start(controller) {
			port.onmessage = ({ data }) => {
				if (data === "end") {
					return controller.close()
				}

				if (data === "abort") {
					controller.error("Aborted the download")
					return
				}

				controller.enqueue(data)
			}
		},
		cancel() {
			port.postMessage({
				abort: true
			})
		}
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

	if (data === "ping") {
		return
	}

	const downloadUrl = data.url || self.registration.scope + Math.random() + "/" + (typeof data === "string" ? data : data.filename)
	const port = e.ports[0]
	const metadata = new Array(3)

	metadata[1] = data
	metadata[2] = port

	if (!port) {
		return
	}

	if (e.data.readableStream) {
		metadata[0] = e.data.readableStream
	} else if (e.data.transferringReadable) {
		port.onmessage = evt => {
			port.onmessage = null
			metadata[0] = evt.data.readableStream
		}
	} else {
		metadata[0] = createStream(port)
	}

	map.set(downloadUrl, metadata)

	port.postMessage({
		download: downloadUrl
	})
})

self.addEventListener("fetch", e => {
	try {
		const url = e.request.url
		const builtURL = new URL(url)

		if (builtURL.pathname === "/ping") {
			e.respondWith(new Response("pong"))
		} else if (builtURL.pathname === "/sw/ping") {
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
			const mapData = map.get(url)

			if (!mapData) {
				return null
			}

			const [stream, data, port] = mapData

			map.delete(url)

			const responseHeaders = new Headers({
				"Content-Type": "application/octet-stream; charset=utf-8",
				"Content-Security-Policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
				"X-Content-Security-Policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
				"X-WebKit-CSP": "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
				"X-XSS-Protection": "1; mode=block",
				"Cross-Origin-Embedder-Policy": "require-corp",
				"X-Content-Type-Options": "nosniff"
			})

			const headers = new Headers(data.headers || {})

			if (headers.has("Content-Length")) {
				responseHeaders.set("Content-Length", headers.get("Content-Length") ?? "0")
			}

			if (headers.has("Content-Disposition")) {
				responseHeaders.set("Content-Disposition", headers.get("Content-Disposition") ?? "")
			}

			if (data.size) {
				responseHeaders.set("Content-Length", data.size)
			}

			let fileName = typeof data === "string" ? data : data.filename

			if (fileName) {
				fileName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, "%2A")

				responseHeaders.set("Content-Disposition", "attachment; filename*=UTF-8''" + fileName)
			}

			e.respondWith(
				new Response(stream, {
					headers: responseHeaders
				})
			)

			port.postMessage({
				debug: "Download started"
			})
		}
	} catch (e) {
		console.error(e)

		return null
	}
})
