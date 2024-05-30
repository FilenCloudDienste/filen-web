import { memo, useMemo, useState } from "react"
import { type DriveCloudItem } from "@/components/drive"
import { fileNameToPreviewType } from "./utils"
import useWindowSize from "@/hooks/useWindowSize"
import TextEditor from "@/components/textEditor"
import useCanUpload from "@/hooks/useCanUpload"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"

const textDecoder = new TextDecoder()

export const Text = memo(
	({ buffer, item, onValueChange }: { buffer: Buffer; item: DriveCloudItem; onValueChange?: (value: string) => void }) => {
		const [value, setValue] = useState<string>(textDecoder.decode(buffer))
		const windowSize = useWindowSize()
		const canUpload = useCanUpload()
		const publicLinkURLState = usePublicLinkURLState()

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
							? "h-screen"
							: "h-[calc(100vh-56px)]"
						: "h-[calc(100vh-48px)]"
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
					autoFocus={true}
					readOnly={!canUpload || publicLinkURLState.isPublicLink}
				/>
			</div>
		)
	}
)

export default Text
