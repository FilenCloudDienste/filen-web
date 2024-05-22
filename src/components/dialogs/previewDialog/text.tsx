import { memo, useMemo, useState } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType } from "./utils"
import useWindowSize from "@/hooks/useWindowSize"
import TextEditor from "@/components/textEditor"
import useCanUpload from "@/hooks/useCanUpload"
import useLocation from "@/hooks/useLocation"
import { cn } from "@/lib/utils"

const textDecoder = new TextDecoder()

export const Text = memo(
	({
		buffer,
		item,
		onValueChange,
		publicLink
	}: {
		buffer: Buffer
		item: DriveCloudItem
		onValueChange?: (value: string) => void
		publicLink?: boolean
	}) => {
		const [value, setValue] = useState<string>(textDecoder.decode(buffer))
		const windowSize = useWindowSize()
		const canUpload = useCanUpload()
		const location = useLocation()

		const previewType = useMemo(() => {
			return fileNameToPreviewType(item.name)
		}, [item.name])

		return (
			<div className={cn("flex flex-row w-full", publicLink ? "h-[calc(100vh-56px)]" : "h-[calc(100vh-48px)]")}>
				<TextEditor
					fileName={item.name}
					value={value}
					setValue={setValue}
					height={windowSize.height - 48}
					type={previewType === "code" ? "code" : "text"}
					showMarkdownPreview={previewType === "md"}
					onValueChange={onValueChange}
					autoFocus={true}
					readOnly={!canUpload || location.includes("/f/") || location.includes("/d/") || publicLink}
				/>
			</div>
		)
	}
)

export default Text
