import { createLazyFileRoute } from "@tanstack/react-router"
import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"

export const Route = createLazyFileRoute("/settings/general")({
	component: SettingsGeneral
})

function SettingsGeneral() {
	return (
		<RequireAuth>
			<MainContainer>yes</MainContainer>
		</RequireAuth>
	)
}
