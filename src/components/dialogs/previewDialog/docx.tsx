import { memo, useCallback, useRef } from "react"
import { renderAsync } from "docx-preview"
import useMountedEffect from "@/hooks/useMountedEffect"

export const DocX = memo(({ buffer }: { buffer: Buffer }) => {
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
		<div className="w-full h-full">
			<div
				ref={container}
				className="w-full h-[calc(100vh-48px)] overflow-auto"
			/>
		</div>
	)
})

export default DocX
