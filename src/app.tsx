import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "@/routeTree.gen"
import { Helmet, HelmetProvider } from "react-helmet-async"
import { helmetCSS } from "./lib/helmet"
import "./index.css"
import "react-quill/dist/quill.snow.css"
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
			<HelmetProvider>
				<Helmet
					style={[
						{
							cssText: helmetCSS()
						}
					]}
				></Helmet>
				<RouterProvider router={router} />
			</HelmetProvider>
		</StrictMode>
	)
}
