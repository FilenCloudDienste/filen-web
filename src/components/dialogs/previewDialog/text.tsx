import { memo, useCallback, useMemo, useState, lazy, Suspense } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType } from "./utils"
import useWindowSize from "@/hooks/useWindowSize"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { githubLight } from "@uiw/codemirror-theme-github"
import { useTheme } from "@/providers/themeProvider"
import { langs } from "@uiw/codemirror-extensions-langs"
import pathModule from "path"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { color } from "@uiw/codemirror-extensions-color"
import { Loader } from "."

const CodeMirror = lazy(() => import("@uiw/react-codemirror"))
const textDecoder = new TextDecoder()

export function loadLanguage(name: string) {
	const { ext } = pathModule.posix.parse(name.toLowerCase())

	switch (ext) {
		case ".js":
		case ".cjs":
		case ".mjs": {
			return langs.javascript({ typescript: false, jsx: false })
		}

		case ".jsx": {
			return langs.javascript({ typescript: false, jsx: true })
		}

		case ".tsx": {
			return langs.javascript({ typescript: true, jsx: true })
		}

		case ".ts": {
			return langs.javascript({ typescript: true, jsx: false })
		}

		case ".md": {
			return langs.markdown()
		}

		case ".cpp": {
			return langs.cpp()
		}

		case ".c": {
			return langs.c()
		}

		case ".php": {
			return langs.php()
		}

		case ".htm":
		case ".html5":
		case ".html": {
			return langs.html()
		}

		case ".css":
		case ".css3": {
			return langs.css()
		}

		case ".coffee":
		case ".litcoffee": {
			return langs.coffeescript()
		}

		case ".sass": {
			return langs.sass()
		}

		case ".xml": {
			return langs.xml()
		}

		case ".json": {
			return langs.json()
		}

		case ".sql": {
			return langs.sql()
		}

		case ".java": {
			return langs.java()
		}

		case ".kt": {
			return langs.kotlin()
		}

		case ".swift": {
			return langs.swift()
		}

		case ".py3":
		case ".py": {
			return langs.python()
		}

		case ".cmake": {
			return langs.cmake()
		}

		case ".cs": {
			return langs.csharp()
		}

		case ".dart": {
			return langs.dart()
		}

		case ".dockerfile": {
			return langs.dockerfile()
		}

		case ".go": {
			return langs.go()
		}

		case ".less": {
			return langs.less()
		}

		case ".yaml": {
			return langs.yaml()
		}

		case ".vue": {
			return langs.vue()
		}

		case ".svelte": {
			return langs.svelte()
		}

		case ".vbs": {
			return langs.vbscript()
		}

		case ".cobol": {
			return langs.cobol()
		}

		case ".toml": {
			return langs.toml()
		}

		case ".conf":
		case ".sh": {
			return langs.shell()
		}

		case ".rs": {
			return langs.rust()
		}

		case ".rb": {
			return langs.ruby()
		}

		case ".ps1":
		case ".bat":
		case ".ps": {
			return langs.powershell()
		}

		case ".protobuf":
		case ".proto": {
			return langs.protobuf()
		}

		default: {
			return null
		}
	}
}

export const Text = memo(({ buffer, item }: { buffer: Buffer; item: DriveCloudItem }) => {
	const [value, setValue] = useState<string>(textDecoder.decode(buffer))
	const windowSize = useWindowSize()
	const theme = useTheme()

	const previewType = useMemo(() => {
		return fileNameToPreviewType(item.name)
	}, [item.name])

	const langExtension = useMemo(() => {
		const lang = loadLanguage(item.name)

		if (!lang) {
			return []
		}

		return [lang]
	}, [item.name])

	const onChange = useCallback((val: string) => {
		setValue(val)
	}, [])

	return (
		<div className="flex flex-row w-full h-[calc(100vh-48px)]">
			<Suspense fallback={<Loader />}>
				<CodeMirror
					value={value}
					onChange={onChange}
					height={windowSize.height - 48 + "px"}
					width={(previewType === "md" ? Math.floor(windowSize.width / 2) : windowSize.width) + "px"}
					theme={theme.dark ? vscodeDark : githubLight}
					extensions={[...langExtension, hyperLink, color]}
					indentWithTab={true}
					editable={true}
					autoFocus={true}
				/>
			</Suspense>
			{previewType === "md" && <>mdPreview</>}
		</div>
	)
})

export default Text
