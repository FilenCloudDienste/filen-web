import { memo, useCallback, useRef } from "react"
import { renderAsync } from "docx-preview"
import useMountedEffect from "@/hooks/useMountedEffect"
import { cn } from "@/lib/utils"

export const DocX = memo(({ buffer, publicLink }: { buffer: Buffer; publicLink?: boolean }) => {
	const container = useRef<HTMLDivElement>(null)

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
				className={cn("w-full overflow-auto select-text", publicLink ? "h-[calc(100vh-56px)]" : "h-[calc(100vh-48px)]")}
			/>
		</div>
	)
})

export default DocX
