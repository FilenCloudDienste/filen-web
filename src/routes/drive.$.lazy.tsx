import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/drive/$")({
	component: Drive
})

function Drive() {
	const route = Route.useParams()

	console.log(route)

	return (
		<div className="p-2">
			<h1>Welcome Home!</h1>
		</div>
	)
}
