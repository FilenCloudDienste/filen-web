import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"
import SyncsComponent from "@/components/syncs"

export const Route = createFileRoute("/syncs")({
	component: Syncs
})

export function Syncs() {
	return (
		<RequireAuth>
			<MainContainer>
				<SyncsComponent />
			</MainContainer>
		</RequireAuth>
	)
}
