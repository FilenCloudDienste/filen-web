import { memo, useMemo, useCallback, useEffect, useRef } from "react"
import * as themes from "./theme"
import { useTheme } from "@/providers/themeProvider"
import { loadLanguage } from "./langs"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { color } from "@uiw/codemirror-extensions-color"
import { type Root, type Element, type RootContent } from "hast"
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from "../ui/resizable"
import { useLocalStorage } from "@uidotdev/usehooks"
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from "@uiw/react-codemirror"
import MarkdownPreview from "@uiw/react-markdown-preview"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import useLocation from "@/hooks/useLocation"

export const TextEditor = memo(
	({
		value,
		setValue,
		fileName,
		height,
		onValueChange,
		editable,
		autoFocus,
		indentWithTab,
		type,
		readOnly,
		placeholder,
		showMarkdownPreview,
		onBlur,
		maxLength
	}: {
		value: string
		setValue: React.Dispatch<React.SetStateAction<string>>
		fileName: string
		height: number
		onValueChange?: (value: string) => void
		editable?: boolean
		autoFocus?: boolean
		indentWithTab?: boolean
		type: "code" | "text"
		readOnly?: boolean
		placeholder?: string
		showMarkdownPreview?: boolean
		onBlur?: () => void
		maxLength?: number
	}) => {
		const codeMirrorRef = useRef<ReactCodeMirrorRef>(null)
		const publicLinkURLState = usePublicLinkURLState()
		const theme = useTheme()
		const location = useLocation()
		const [resizablePanelSizes, setResizablePanelSizes] = useLocalStorage<number[]>(
			location.includes("notes")
				? "textEditorResizablePanelSizes:notes"
				: publicLinkURLState.isPublicLink
					? "textEditorResizablePanelSizes:publicLink"
					: "textEditorResizablePanelSizes",
			[50, 50]
		)

		const onChange = useCallback(
			(val: string) => {
				if (maxLength && val.length >= maxLength) {
					val = val.slice(0, maxLength)
				}

				setValue(val)

				if (onValueChange) {
					onValueChange(val)
				}
			},
			[onValueChange, setValue, maxLength]
		)

		const editorTheme = useMemo(() => {
			return theme.dark ? themes.dark : themes.light
		}, [theme.dark])

		const langExtension = useMemo(() => {
			const lang = loadLanguage(fileName)

			if (!lang) {
				return []
			}

			return [lang]
		}, [fileName])

		const rehypeRewrite = useCallback((node: Root | RootContent, _?: number, parent?: Root | Element) => {
			try {
				// @ts-expect-error Not typed
				if (node.tagName === "a" && parent && /^h(1|2|3|4|5|6)/.test(parent.tagName)) {
					parent.children = parent.children.slice(1)
				}

				// @ts-expect-error Not typed
				if (node.tagName === "a" && node.properties && node.properties.href) {
					// @ts-expect-error Not typed
					if (node.properties.href.indexOf("#") !== -1) {
						// @ts-expect-error Not typed
						node.properties.href = window.location.hash
					} else {
						// @ts-expect-error Not typed
						node.properties.target = "_blank"
					}
				}
			} catch (e) {
				console.error(e)
			}
		}, [])

		const extensions = useMemo(() => {
			return type === "code"
				? [
						...langExtension,
						hyperLink,
						color,
						EditorView.lineWrapping,
						EditorView.theme({
							"&": {
								fontFamily: "Menlo, Monaco, Lucida Console, monospace"
							},
							".cm-content": {
								padding: "0px"
							}
						})
					]
				: [
						EditorView.lineWrapping,
						EditorView.theme({
							".cm-content": {
								padding: "10px",
								paddingTop: "13px"
							}
						})
					]
		}, [type, langExtension])

		const onCreateEditor = useCallback((view: EditorView) => {
			view.dispatch({
				scrollIntoView: true
			})
		}, [])

		useEffect(() => {
			codeMirrorRef.current?.view?.dispatch({
				scrollIntoView: true
			})
		}, [])

		return (
			<div className="flex flex-row w-full h-full">
				<ResizablePanelGroup
					direction="horizontal"
					onLayout={setResizablePanelSizes}
				>
					<ResizablePanel
						defaultSize={resizablePanelSizes[0]}
						minSize={20}
						maxSize={80}
						order={1}
						className={type === "code" ? "font-mono" : undefined}
					>
						<CodeMirror
							ref={codeMirrorRef}
							value={value}
							onChange={onChange}
							height={height + "px"}
							maxHeight={height + "px"}
							minHeight={height + "px"}
							width="100%"
							maxWidth="100%"
							minWidth="100%"
							theme={editorTheme}
							extensions={extensions}
							indentWithTab={indentWithTab}
							editable={editable}
							autoFocus={autoFocus}
							readOnly={readOnly}
							placeholder={placeholder}
							onBlur={onBlur}
							onCreateEditor={onCreateEditor}
							basicSetup={{
								lineNumbers: type === "code",
								searchKeymap: type === "code",
								tabSize: 4,
								highlightActiveLine: type === "code",
								highlightActiveLineGutter: type === "code",
								foldGutter: type === "code",
								foldKeymap: type === "code",
								syntaxHighlighting: type === "code"
							}}
							style={{
								height,
								minHeight: height,
								maxHeight: height,
								width: "100%",
								minWidth: "100%",
								maxWidth: "100%"
							}}
						/>
					</ResizablePanel>
					{showMarkdownPreview && (
						<>
							<ResizableHandle
								className="bg-transparent w-0"
								withHandle={true}
							/>
							<ResizablePanel
								defaultSize={resizablePanelSizes[1]}
								minSize={20}
								maxSize={80}
								order={2}
								className="border-l"
							>
								<MarkdownPreview
									source={value}
									className="markdown-content"
									style={{
										width: "100%",
										height: height + "px",
										paddingLeft: "15px",
										paddingRight: "15px",
										paddingTop: "10px",
										paddingBottom: "15px",
										color: theme.dark ? "white" : "black",
										userSelect: "text",
										backgroundColor: "transparent",
										overflowY: "auto",
										overflowX: "auto"
									}}
									rehypeRewrite={rehypeRewrite}
									wrapperElement={{
										"data-color-mode": theme.dark ? "dark" : "light"
									}}
								/>
							</ResizablePanel>
						</>
					)}
				</ResizablePanelGroup>
			</div>
		)
	}
)

export default TextEditor
