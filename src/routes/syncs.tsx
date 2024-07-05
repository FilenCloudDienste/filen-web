import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"
import SyncsComponent from "@/components/syncs"
import { IS_DESKTOP } from "@/constants"

export const Route = createFileRoute("/syncs")({
	component: Syncs
})

export function Syncs() {
	if (!IS_DESKTOP) {
		return null
	}

	return (
		<RequireAuth>
			<MainContainer>
				<SyncsComponent />
			</MainContainer>
		</RequireAuth>
	)
}
