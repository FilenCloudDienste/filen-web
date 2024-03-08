import { createLazyFileRoute } from "@tanstack/react-router"
import AppContainer from "@/components/appContainer"

export const Route = createLazyFileRoute("/")({
	component: Index
})

function Index() {
	return (
		<AppContainer>
			<h3>Welcome Home!</h3>
		</AppContainer>
	)
}
