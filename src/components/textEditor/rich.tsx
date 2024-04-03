import { memo, lazy, useState, Suspense, useCallback, useEffect } from "react"
import type ReactQuill from "react-quill"
import Icon from "../icon"
import { useTheme } from "@/providers/themeProvider"
import { normalizeChecklistValue } from "../notes/utils"

const Quill = lazy(() => import("react-quill"))

export const RichTextEditor = memo(
	({
		width,
		height,
		readOnly,
		value,
		setValue,
		onValueChange,
		placeholder,
		onBlur,
		type
	}: {
		width: number
		height: number
		readOnly?: boolean
		value: string
		setValue: React.Dispatch<React.SetStateAction<string>>
		onValueChange?: (value: string) => void
		placeholder?: string
		onBlur?: () => void
		type: "rich" | "checklist"
	}) => {
		const [quillRef, setQuillRef] = useState<ReactQuill>()
		const theme = useTheme()

		const onChange = useCallback(
			(val: string) => {
				if (type === "checklist") {
					val = normalizeChecklistValue(val)
				}

				setValue(val)

				if (onValueChange) {
					onValueChange(val)
				}
			},
			[type, onValueChange, setValue]
		)

		useEffect(() => {
			quillRef?.editor?.root?.setAttribute("spellcheck", "false")
			quillRef?.getEditor()?.root?.setAttribute("spellcheck", "false")
		}, [quillRef])

		return (
			<Suspense
				fallback={
					<div
						style={{
							width,
							height
						}}
						className="flex flex-col items-center justify-center"
					>
						<Icon
							name="loader"
							className="animate-spin"
						/>
					</div>
				}
			>
				<Quill
					theme="snow"
					value={value}
					placeholder={placeholder}
					ref={ref => {
						if (ref) {
							setQuillRef(ref)
						}
					}}
					onBlur={onBlur}
					readOnly={readOnly}
					preserveWhitespace={true}
					modules={
						type === "rich"
							? {
									toolbar: [
										[{ header: [1, 2, 3, 4, 5, 6, false] }],
										["bold", "italic", "underline"],
										["code-block", "link", "blockquote"],
										[{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
										[{ indent: "-1" }, { indent: "+1" }],
										[{ script: "sub" }, { script: "super" }],
										[{ direction: "rtl" }]
									]
								}
							: {
									toolbar: []
								}
					}
					formats={
						type === "rich"
							? [
									"bold",
									"code",
									"italic",
									"link",
									"size",
									"strike",
									"script",
									"underline",
									"blockquote",
									"header",
									"indent",
									"list",
									"align",
									"direction",
									"code-block"
								]
							: ["list"]
					}
					style={{
						width: width + "px",
						height: height - 35 + "px",
						border: "none",
						color: theme.dark ? "white" : "black",
						marginTop: type === "checklist" ? "-47px" : undefined,
						marginLeft: type === "checklist" ? "-23px" : undefined
					}}
					onChange={onChange}
				/>
			</Suspense>
		)
	}
)

export default RichTextEditor
