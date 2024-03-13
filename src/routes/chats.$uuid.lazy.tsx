import { createLazyFileRoute } from "@tanstack/react-router"
import RequireAuth from "@/components/requireAuthed"
import MainContainer from "@/components/mainContainer"

export const Route = createLazyFileRoute("/chats/$uuid")({
	component: Chats
})

export function Chats() {
	return (
		<RequireAuth>
			<MainContainer>chats</MainContainer>
		</RequireAuth>
	)
}
