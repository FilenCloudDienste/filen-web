import { memo, useCallback, useRef } from "react"
import useMountedEffect from "@/hooks/useMountedEffect"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import mammoth from "mammoth"
import "./docx.css"

export const DocX = memo(({ buffer }: { buffer: Buffer }) => {
	const container = useRef<HTMLDivElement>(null)
	const publicLinkURLState = usePublicLinkURLState()

	const loadDocX = useCallback(async () => {
		if (!container.current) {
			return
		}

		try {
			const result = await mammoth.convertToHtml(
				{ arrayBuffer: buffer },
				{ includeDefaultStyleMap: false, includeEmbeddedStyleMap: false }
			)

			container.current.innerHTML = result.value

			if (result.messages.length > 0) {
				console.error(result.messages)
			}
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
				className={cn(
					"w-full overflow-hidden select-text justify-center flex flex-row",
					publicLinkURLState.isPublicLink
						? publicLinkURLState.embed || publicLinkURLState.chatEmbed
							? "h-[100dvh]"
							: "h-[calc(100dvh-56px)]"
						: "h-[calc(100dvh-48px)]"
				)}
			>
				<div className="flex flex-row w-[800px] h-full justify-center overflow-y-auto bg-white">
					<div
						className="docx-viewer w-full h-full bg-white text-black p-6 pb-12"
						ref={container}
					/>
				</div>
			</div>
		</div>
	)
})

export default DocX
