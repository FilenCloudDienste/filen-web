import { createLazyFileRoute } from "@tanstack/react-router"
import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import useGlobalState from "@/hooks/useGlobalState"

export const Route = createLazyFileRoute("/drive/$")({
	component: Drive
})

function Drive() {
	//const route = Route.useParams()
	const [search] = useGlobalState<string>("search", "")

	console.log(search)

	return (
		<RequireAuth>
			<MainContainer>{search}</MainContainer>
		</RequireAuth>
	)
}
