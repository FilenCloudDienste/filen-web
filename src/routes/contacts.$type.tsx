import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"
import ContactsComponent from "@/components/contacts"

export const Route = createFileRoute("/contacts/$type")({
	component: Contacts
})

export function Contacts() {
	return (
		<RequireAuth>
			<MainContainer>
				<ContactsComponent />
			</MainContainer>
		</RequireAuth>
	)
}
