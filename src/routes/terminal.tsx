import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"
import TerminalComponent from "@/components/terminal"
import { IS_DESKTOP } from "@/constants"

export const Route = createFileRoute("/terminal")({
	component: Terminal
})

export function Terminal() {
	if (!IS_DESKTOP) {
		return null
	}

	return (
		<RequireAuth>
			<MainContainer>
				<TerminalComponent />
			</MainContainer>
		</RequireAuth>
	)
}
