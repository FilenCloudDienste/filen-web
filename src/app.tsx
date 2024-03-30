import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "@/routeTree.gen"
import "./index.css"
import "./lib/i18n"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

const rootElement = document.getElementById("app")

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)

	root.render(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>
	)
}
