import { memo, useState, useCallback, useEffect, useMemo } from "react"
import Quill from "react-quill"
import DOMPurify from "dompurify"
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

		const setRef = useCallback((ref: Quill | null) => {
			if (ref) {
				setQuillRef(ref)
			}
		}, [])

		const modules = useMemo(() => {
			return type === "rich"
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
		}, [type])

		const formats = useMemo(() => {
			return type === "rich"
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
		}, [type])

		const style = useMemo(() => {
			return {
				width: (type === "checklist" ? width + 23 : width) + "px",
				height: (type === "checklist" ? height + 38 : height) - 35 + "px",
				border: "none",
				color: theme.dark ? "white" : "black",
				marginTop: type === "checklist" ? "-47px" : undefined,
				marginLeft: type === "checklist" ? "-23px" : undefined
			}
		}, [width, height, theme.dark, type])

		useEffect(() => {
			quillRef?.editor?.root?.setAttribute("spellcheck", "false")
			quillRef?.getEditor()?.root?.setAttribute("spellcheck", "false")
		}, [quillRef])

		// Notes can be shared / collaboratively edited, so decrypted note HTML is untrusted. On the READ-ONLY display path
		// (viewing a note without write access, or note history) sanitize before handing it to Quill - defense in depth
		// against react-quill / Quill 1.3.7 HTML-parsing quirks. Only the read-only path is sanitized so the value round-
		// tripped during live editing is never altered (that would disrupt the editor); there Quill's own HTML->Delta
		// conversion already restricts formats. The html profile preserves Quill's formatting, so notes render identically.
		const sanitizedValue = useMemo(() => {
			return readOnly ? DOMPurify.sanitize(value, { USE_PROFILES: { html: true } }) : value
		}, [value, readOnly])

		return (
			<Quill
				theme="snow"
				value={sanitizedValue}
				placeholder={placeholder}
				ref={setRef}
				onBlur={onBlur}
				readOnly={readOnly}
				preserveWhitespace={true}
				modules={modules}
				formats={formats}
				style={style}
				onChange={onChange}
			/>
		)
	}
)

export default RichTextEditor
