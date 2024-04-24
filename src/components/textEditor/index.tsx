import { memo, useMemo, useCallback } from "react"
import * as themes from "./theme"
import { useTheme } from "@/providers/themeProvider"
import { loadLanguage } from "./langs"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { color } from "@uiw/codemirror-extensions-color"
import { type Root, type Element, type RootContent } from "hast"
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from "../ui/resizable"
import { useLocalStorage } from "@uidotdev/usehooks"
import CodeMirror from "@uiw/react-codemirror"
import MarkdownPreview from "@uiw/react-markdown-preview"

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
		onBlur
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
	}) => {
		const theme = useTheme()
		const [resizablePanelSizes, setResizablePanelSizes] = useLocalStorage<number[]>("textEditorResizablePanelSizes", [50, 50])

		const onChange = useCallback(
			(val: string) => {
				setValue(val)

				if (onValueChange) {
					onValueChange(val)
				}
			},
			[onValueChange, setValue]
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
							value={value}
							onChange={onChange}
							height={height + "px"}
							maxHeight={height + "px"}
							minHeight={height + "px"}
							width="100%"
							maxWidth="100%"
							minWidth="100%"
							theme={editorTheme}
							extensions={type === "code" ? [...langExtension, hyperLink, color] : undefined}
							indentWithTab={indentWithTab}
							editable={editable}
							autoFocus={autoFocus}
							readOnly={readOnly}
							placeholder={placeholder}
							onBlur={onBlur}
							className={type === "code" ? "font-mono" : undefined}
							basicSetup={{
								lineNumbers: type === "code",
								searchKeymap: type === "code",
								tabSize: 4,
								highlightActiveLine: type === "code",
								highlightActiveLineGutter: type === "code",
								foldGutter: type === "code",
								foldKeymap: type === "code"
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
									skipHtml={true}
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
