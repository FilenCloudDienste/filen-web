import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"

export const Route = createFileRoute("/contacts")({
	component: Contacts
})

export function Contacts() {
	return (
		<RequireAuth>
			<MainContainer>Contacts</MainContainer>
		</RequireAuth>
	)
}
