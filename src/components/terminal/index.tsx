import { memo, useRef, useEffect } from "react"
import { Terminal as XTerminal } from "@xterm/xterm"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"

export const Terminal = memo(() => {
	const containerRef = useRef<HTMLDivElement>(null)
	const terminal = useRef<XTerminal>(
		new XTerminal({
			allowProposedApi: true,
			cursorBlink: true
		})
	)

	useEffect(() => {
		if (containerRef.current && terminal.current) {
			terminal.current.open(containerRef.current)
			terminal.current.focus()

			terminal.current.onKey((key, event) => {
				console.log(key, event)

				terminal.current.write(key.key)
			})
		}
	}, [])

	return (
		<div
			className="flex flex-col w-full bg-black"
			style={{
				height: "calc(100dvh - " + DESKTOP_TOPBAR_HEIGHT + "px)"
			}}
		>
			<div
				ref={containerRef}
				className="w-full h-full p-3"
			/>
		</div>
	)
})

export default Terminal
