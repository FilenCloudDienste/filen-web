import { createLazyFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"

export const Route = createLazyFileRoute("/notes/$uuid")({
	component: Notes
})

export function Notes() {
	return (
		<RequireAuth>
			<MainContainer>ok</MainContainer>
		</RequireAuth>
	)
}
