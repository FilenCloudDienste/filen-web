import pathModule from "path"
import other from "./svg/other.svg"
import folder from "./svg/folder.svg"
import folderShared from "./svg/folder-shared.svg"
import folderFavorited from "./svg/folder-favorited.svg"
import folderTrashed from "./svg/folder-trashed.svg"
import txt from "./svg/txt.svg"
import pdf from "./svg/pdf.svg"
import image from "./svg/image.svg"
import archive from "./svg/archive.svg"
import audio from "./svg/audio.svg"
import video from "./svg/video.svg"
import code from "./svg/code.svg"
import exe from "./svg/exe.svg"
import doc from "./svg/doc.svg"
import xls from "./svg/xls.svg"
import ppt from "./svg/ppt.svg"
import apple from "./svg/apple.svg"
import android from "./svg/android.svg"
import iso from "./svg/iso.svg"
import psd from "./svg/psd.svg"
import cad from "./svg/cad.svg"

export function fileNameToSVGIcon(name: string) {
	const parsed = pathModule.posix.parse(name)

	switch (parsed.ext) {
		case ".dmg":
		case ".iso": {
			return iso
		}

		case ".cad": {
			return cad
		}

		case ".psd": {
			return psd
		}

		case ".apk": {
			return android
		}

		case ".ipa": {
			return apple
		}

		case ".txt": {
			return txt
		}

		case ".pdf": {
			return pdf
		}

		case ".gif":
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".heic":
		case ".svg": {
			return image
		}

		case ".pkg":
		case ".rar":
		case ".tar":
		case ".zip":
		case ".7zip": {
			return archive
		}

		case ".wmv":
		case ".mov":
		case ".avi":
		case ".mp4": {
			return video
		}

		case ".mp3": {
			return audio
		}

		case ".ahk":
		case ".html":
		case ".htm":
		case ".css":
		case ".ts":
		case ".java":
		case ".c":
		case ".swift":
		case ".py":
		case ".jsx":
		case ".tsx":
		case ".cjs":
		case ".mjs":
		case ".js": {
			return code
		}

		case ".jar":
		case ".bin": {
			return exe
		}

		case ".doc":
		case ".docx": {
			return doc
		}

		case ".ppt":
		case ".pptx": {
			return ppt
		}

		case ".xls":
		case ".xlsx": {
			return xls
		}

		default: {
			return other
		}
	}
}

export { folder as folderIcon }
export { folderShared as folderSharedIcon }
export { folderFavorited as folderFavoritedIcon }
export { folderTrashed as folderTrashedIcon }
