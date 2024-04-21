import { createFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"
import NotesComponent from "@/components/notes"

export const Route = createFileRoute("/notes")({
	component: Notes
})

export function Notes() {
	return (
		<RequireAuth>
			<MainContainer>
				<NotesComponent />
			</MainContainer>
		</RequireAuth>
	)
}
