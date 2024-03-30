import { createLazyFileRoute } from "@tanstack/react-router"
import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import SettingsComponent from "@/components/settings"

export const Route = createLazyFileRoute("/settings/$type")({
	component: Settings
})

function Settings() {
	return (
		<RequireAuth>
			<MainContainer>
				<SettingsComponent />
			</MainContainer>
		</RequireAuth>
	)
}
