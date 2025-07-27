import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import "./styles.css"

export const history = createHashHistory()

export const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	history
})

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

export const rootElement = document.getElementById("app")

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)

	root.render(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>
	)
}
