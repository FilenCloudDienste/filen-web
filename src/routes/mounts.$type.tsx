import { createFileRoute } from "@tanstack/react-router"
import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import MountsComponent from "@/components/mounts"
import { IS_DESKTOP } from "@/constants"

export const Route = createFileRoute("/mounts/$type")({
	component: Mounts
})

function Mounts() {
	if (!IS_DESKTOP) {
		return null
	}

	return (
		<RequireAuth>
			<MainContainer>
				<MountsComponent />
			</MainContainer>
		</RequireAuth>
	)
}
