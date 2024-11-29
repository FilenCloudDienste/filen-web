import pathModule from "path"
import mimeTypes from "mime-types"

/**
 * Convert file name to preview type.
 *
 * @export
 * @param {string} name
 * @returns {("pdf" | "image" | "video" | "audio" | "code" | "text" | "md" | "docx" | "other")}
 */
export function fileNameToPreviewType(name: string) {
	const parsed = pathModule.posix.parse(name.toLowerCase())

	switch (parsed.ext) {
		case ".pdf": {
			return "pdf"
		}

		case ".gif":
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".webp":
		case ".svg": {
			return "image"
		}

		case ".mov":
		case ".mkv":
		case ".webm":
		case ".mp4": {
			return "video"
		}

		case ".mp3": {
			return "audio"
		}

		case ".js":
		case ".cjs":
		case ".mjs":
		case ".jsx":
		case ".tsx":
		case ".ts":
		case ".cpp":
		case ".c":
		case ".php":
		case ".htm":
		case ".html5":
		case ".html":
		case ".css":
		case ".css3":
		case ".sass":
		case ".xml":
		case ".json":
		case ".sql":
		case ".java":
		case ".kt":
		case ".swift":
		case ".py3":
		case ".py":
		case ".cmake":
		case ".cs":
		case ".dart":
		case ".dockerfile":
		case ".go":
		case ".less":
		case ".yaml":
		case ".vue":
		case ".svelte":
		case ".vbs":
		case ".cobol":
		case ".toml":
		case ".conf":
		case ".sh":
		case ".rs":
		case ".rb":
		case ".ps1":
		case ".bat":
		case ".ps":
		case ".protobuf":
		case ".ahk":
		case ".litcoffee":
		case ".coffee":
		case ".log":
		case ".proto": {
			return "code"
		}

		case ".txt": {
			return "text"
		}

		case ".md": {
			return "md"
		}

		case ".docx": {
			return "docx"
		}

		default: {
			return "other"
		}
	}
}

/**
 * Convert file name to thumbnail type.
 *
 * @export
 * @param {string} name
 * @returns {("pdf" | "image" | "video" | "none")}
 */
export function fileNameToThumbnailType(name: string) {
	const parsed = pathModule.posix.parse(name.toLowerCase())

	switch (parsed.ext) {
		case ".pdf": {
			return "pdf"
		}

		case ".gif":
		case ".png":
		case ".jpg":
		case ".webp":
		case ".jpeg": {
			return "image"
		}

		case ".mov":
		case ".mkv":
		case ".webm":
		case ".mp4": {
			return "video"
		}

		default: {
			return "none"
		}
	}
}

/**
 * Ensure that a text file's name includes an editable file extension.
 *
 * @export
 * @param {string} filename
 * @returns {string}
 */
export function ensureTextFileExtension(filename: string): string {
	const fileExtension = filename.split(".").pop()?.toLowerCase()
	const previewType = fileNameToPreviewType(filename)

	if (fileExtension && (previewType === "code" || previewType === "text")) {
		return filename
	}

	return `${filename}.txt`
}

export const streamableMimeTypes: string[] = [
	"video/mp4",
	"video/webm",
	"video/ogg",
	"video/x-ms-wmv",
	"video/x-ms-asf",
	"video/x-flv",
	"video/x-matroska",
	"video/x-mkv",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-mpeg",
	"video/x-mpeg2",
	"video/x-mpeg4",
	"video/x-m4v",
	"video/x-m4a",
	"video/x-3gp",
	"video/x-3gpp",
	"video/x-3gpp2",
	"video/x-flv",
	"audio/mpeg",
	"audio/x-mp3",
	"audio/x-wav",
	"audio/x-m4a",
	"audio/x-m4b",
	"audio/x-m4r",
	"audio/x-m4p",
	"audio/x-aac",
	"audio/x-aiff",
	"audio/x-au",
	"audio/x-flac",
	"audio/x-ogg",
	"audio/x-vorbis",
	"audio/x-opus",
	"image/jpeg",
	"image/pjpeg",
	"image/png",
	"image/gif",
	"image/bmp",
	"image/webp",
	"image/avif",
	"image/apng",
	"image/svg+xml",
	"image/x-icon",
	"image/vnd.microsoft.icon",
	"image/tiff"
]

export function isFileStreamable(name: string, mime: string): boolean {
	const mimeType = mime.length > 0 ? mime : mimeTypes.lookup(name) || "application/octet-stream"

	return streamableMimeTypes.includes(mimeType)
}
