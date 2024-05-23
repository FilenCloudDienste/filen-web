import { memo, useCallback, useRef } from "react"
import { renderAsync } from "docx-preview"
import useMountedEffect from "@/hooks/useMountedEffect"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"

export const DocX = memo(({ buffer }: { buffer: Buffer }) => {
	const container = useRef<HTMLDivElement>(null)
	const publicLinkURLState = usePublicLinkURLState()

	const loadDocX = useCallback(async () => {
		if (!container.current) {
			return
		}

		try {
			await renderAsync(buffer, container.current as HTMLElement)
		} catch (e) {
			console.error(e)
		}
	}, [buffer])

	useMountedEffect(() => {
		loadDocX()
	})

	return (
		<div className="w-full h-full select-text">
			<div
				ref={container}
				className={cn(
					"w-full overflow-auto select-text",
					publicLinkURLState.isPublicLink
						? publicLinkURLState.embed || publicLinkURLState.chatEmbed
							? "h-screen"
							: "h-[calc(100vh-56px)]"
						: "h-[calc(100vh-48px)]"
				)}
			/>
		</div>
	)
})

export default DocX
