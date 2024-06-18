import { memo, useState, useCallback, useEffect } from "react"
import Quill from "react-quill"
import { useTheme } from "@/providers/themeProvider"
import { normalizeChecklistValue } from "../notes/utils"

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
		type,
		maxLength
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
		maxLength?: number
	}) => {
		const [quillRef, setQuillRef] = useState<Quill>()
		const theme = useTheme()

		const onChange = useCallback(
			(val: string) => {
				if (type === "checklist") {
					val = normalizeChecklistValue(val)
				}

				if (maxLength && val.length >= maxLength) {
					val = val.slice(0, maxLength)
				}

				setValue(val)

				if (onValueChange) {
					onValueChange(val)
				}
			},
			[type, onValueChange, setValue, maxLength]
		)

		useEffect(() => {
			quillRef?.editor?.root?.setAttribute("spellcheck", "false")
			quillRef?.getEditor()?.root?.setAttribute("spellcheck", "false")
		}, [quillRef])

		return (
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
					width: (type === "checklist" ? width + 23 : width) + "px",
					height: (type === "checklist" ? height + 38 : height) - 35 + "px",
					border: "none",
					color: theme.dark ? "white" : "black",
					marginTop: type === "checklist" ? "-47px" : undefined,
					marginLeft: type === "checklist" ? "-23px" : undefined
				}}
				onChange={onChange}
			/>
		)
	}
)

export default RichTextEditor
