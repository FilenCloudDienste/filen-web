import { createFileRoute } from "@tanstack/react-router"
import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import MountsComponent from "@/components/mounts"

export const Route = createFileRoute("/mounts/$type")({
	component: Mounts
})

function Mounts() {
	return (
		<RequireAuth>
			<MainContainer>
				<MountsComponent />
			</MainContainer>
		</RequireAuth>
	)
}
