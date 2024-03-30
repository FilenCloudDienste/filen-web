import pathModule from "path"

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
		case ".svg": {
			return "image"
		}

		case ".wmv":
		case ".mov":
		case ".avi":
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

export function fileNameToThumbnailType(name: string) {
	const parsed = pathModule.posix.parse(name.toLowerCase())

	switch (parsed.ext) {
		case ".pdf": {
			return "pdf"
		}

		case ".gif":
		case ".png":
		case ".jpg":
		case ".jpeg": {
			return "image"
		}

		case ".mp4": {
			return "video"
		}

		case ".txt": {
			return "text"
		}

		default: {
			return "none"
		}
	}
}
