import { memo, useMemo, useCallback, useEffect, useRef, type ClassAttributes, type HTMLAttributes } from "react"
import * as themes from "./theme"
import { useTheme } from "@/providers/themeProvider"
import { loadLanguage } from "./langs"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { color } from "@uiw/codemirror-extensions-color"
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from "../ui/resizable"
import { useLocalStorage } from "@uidotdev/usehooks"
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import useLocation from "@/hooks/useLocation"
import Markdown, { type ExtraProps } from "react-markdown"
import { type Element, type Root } from "hast"
import gfm from "remark-gfm"
import { remarkAlert } from "remark-github-blockquote-alert"
import { cn } from "@/lib/utils"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import rehypeExternalLinks from "rehype-external-links"
import { visit } from "unist-util-visit"
import "./markdownStyle.less"

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
		const { dark } = useTheme()
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
			return dark ? themes.dark : themes.light
		}, [dark])

		const langExtension = useMemo(() => {
			const lang = loadLanguage(fileName)

			if (!lang) {
				return []
			}

			return [lang]
		}, [fileName])

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

		const markdownComponents = useMemo(() => {
			return {
				code(props: ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps) {
					try {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { children, className, node, ...rest } = props
						const match = /language-(\w+)/.exec(className || "")

						return match ? (
							// @ts-expect-error Not typed
							<SyntaxHighlighter
								{...rest}
								PreTag="div"
								children={String(children).replace(/\n$/, "")}
								language={match?.[1] ?? "bash"}
								style={dark ? oneDark : oneLight}
							/>
						) : (
							<code
								{...rest}
								className={className}
							>
								{children}
							</code>
						)
					} catch (e) {
						console.error(e)
					}
				}
			}
		}, [dark])

		const markdownAllowElement = useCallback((element: Element) => {
			if (!element.tagName) {
				return
			}

			return /^[A-Za-z0-9]+$/.test(element.tagName)
		}, [])

		const markdownRehypeRewriteLinks = useCallback(() => {
			return (tree: Root) => {
				visit(tree, "element", node => {
					if (node.tagName === "a") {
						if (!node.properties) {
							node.properties = {}
						}

						if (typeof node.properties.href === "string" && node.properties.href.startsWith("http")) {
							return
						}

						node.properties.href = window.location.href
					}
				})
			}
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
								<Markdown
									children={value}
									className={cn(
										"markdown-content wmde-markdown wmde-markdown-color w-full h-full bg-transparent overflow-auto pb-12 px-4 pt-4",
										dark ? "text-white" : "text-black"
									)}
									skipHtml={true}
									remarkPlugins={[remarkAlert, gfm]}
									rehypePlugins={[[rehypeExternalLinks, { target: "_blank" }], markdownRehypeRewriteLinks]}
									allowElement={markdownAllowElement}
									components={markdownComponents}
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
