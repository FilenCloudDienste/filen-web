import { memo, useMemo, useState } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType } from "./utils"
import useWindowSize from "@/hooks/useWindowSize"
import TextEditor from "@/components/textEditor"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import useIsMobile from "@/hooks/useIsMobile"

const textDecoder = new TextDecoder()

export const Text = memo(
	({
		buffer,
		item,
		onValueChange,
		readOnly
	}: {
		buffer: Buffer
		item: DriveCloudItem
		onValueChange?: (value: string) => void
		readOnly: boolean
	}) => {
		const [value, setValue] = useState<string>(textDecoder.decode(buffer))
		const windowSize = useWindowSize()
		const publicLinkURLState = usePublicLinkURLState()
		const isMobile = useIsMobile()

		const previewType = useMemo(() => {
			return fileNameToPreviewType(item.name)
		}, [item.name])

		const height = useMemo(() => {
			if (!publicLinkURLState.isPublicLink) {
				return windowSize.height - 48
			}

			return publicLinkURLState.chatEmbed ? windowSize.height : windowSize.height - 56
		}, [windowSize.height, publicLinkURLState.isPublicLink, publicLinkURLState.chatEmbed])

		return (
			<div
				className={cn(
					"flex flex-row w-full",
					publicLinkURLState.isPublicLink
						? publicLinkURLState.chatEmbed
							? "h-[100dvh]"
							: "h-[calc(100dvh-56px)]"
						: "h-[calc(100dvh-48px)]"
				)}
			>
				<TextEditor
					fileName={item.name}
					value={value}
					setValue={setValue}
					height={height}
					type={previewType === "code" || previewType === "md" ? "code" : "text"}
					showMarkdownPreview={previewType === "md"}
					onValueChange={onValueChange}
					autoFocus={!isMobile}
					readOnly={readOnly}
				/>
			</div>
		)
	}
)

export default Text
