import { memo, useMemo, useState } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType } from "./utils"
import useWindowSize from "@/hooks/useWindowSize"
import TextEditor from "@/components/textEditor"

const textDecoder = new TextDecoder()

export const Text = memo(({ buffer, item }: { buffer: Buffer; item: DriveCloudItem }) => {
	const [value, setValue] = useState<string>(textDecoder.decode(buffer))
	const windowSize = useWindowSize()

	const previewType = useMemo(() => {
		return fileNameToPreviewType(item.name)
	}, [item.name])

	return (
		<div className="flex flex-row w-full h-[calc(100vh-48px)]">
			<TextEditor
				fileName={item.name}
				value={value}
				setValue={setValue}
				height={windowSize.height - 48}
				type={previewType === "code" ? "code" : "text"}
			/>
			{previewType === "md" && <>mdPreview</>}
		</div>
	)
})

export default Text
