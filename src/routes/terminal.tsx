import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"
import TerminalComponent from "@/components/terminal"

export const Route = createFileRoute("/terminal")({
	component: Terminal
})

export function Terminal() {
	return (
		<RequireAuth>
			<MainContainer>
				<TerminalComponent />
			</MainContainer>
		</RequireAuth>
	)
}
