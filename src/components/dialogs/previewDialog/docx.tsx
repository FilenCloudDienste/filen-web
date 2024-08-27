import { memo, useCallback, useRef } from "react"
import useMountedEffect from "@/hooks/useMountedEffect"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import * as docx from "docx-preview"

export const DocX = memo(({ buffer }: { buffer: Buffer }) => {
	const container = useRef<HTMLDivElement>(null)
	const publicLinkURLState = usePublicLinkURLState()

	const loadDocX = useCallback(async () => {
		if (!container.current) {
			return
		}

		try {
			await docx.renderAsync(buffer, container.current, container.current, {
				ignoreHeight: false,
				ignoreWidth: false,
				ignoreFonts: false,
				breakPages: true,
				debug: import.meta.env.DEV,
				experimental: true,
				inWrapper: true,
				trimXmlDeclaration: true,
				ignoreLastRenderedPageBreak: true,
				renderHeaders: true,
				renderFooters: true,
				renderFootnotes: true
			})
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
