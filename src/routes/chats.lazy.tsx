import { createLazyFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"

export const Route = createLazyFileRoute("/chats")({
	component: Chats
})

export function Chats() {
	return (
		<RequireAuth>
			<MainContainer>ok</MainContainer>
		</RequireAuth>
	)
}
