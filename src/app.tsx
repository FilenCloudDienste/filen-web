//import "./wdyr"
//import "hacktimer/HackTimer.silent.min"
import "./index.css"
import "react-quill/dist/quill.snow.css"
import "./lib/i18n"
//import "@xterm/xterm/css/xterm.css"
import { StrictMode, memo } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router"
import { routeTree } from "@/routeTree.gen"
import { Helmet, HelmetProvider } from "react-helmet-async"
import { helmetCSS } from "./lib/helmet"
import { setThemeOnPageLoad, useTheme } from "./providers/themeProvider"
import { type CookieConsentValues } from "./components/cookieConsent"
import { useLocalStorage } from "@uidotdev/usehooks"
import { IS_DESKTOP } from "./constants"
import { isMobileDevice } from "./utils"

setThemeOnPageLoad()

export const history = createHashHistory()
export const router = createRouter({ routeTree, history })

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

export const rootElement = document.getElementById("app")

export const HelmetComponent = memo(() => {
	const { dark } = useTheme()
	const [cookieConsent] = useLocalStorage<CookieConsentValues>("cookieConsent", "undecided")

	return (
		<Helmet
			style={[
				{
					cssText: helmetCSS()
				}
			]}
		>
			<meta
				name="theme-color"
				content={dark ? "#09090b" : "#f4f4f5"}
			/>
			{(window.location.href.includes("/f/") || window.location.href.includes("/d/")) && (
				<meta
					name="robots"
					content="noindex, nofollow"
				/>
			)}
			{cookieConsent === "full" && !IS_DESKTOP && (
				<script
					defer={true}
					data-domain="app.filen.io"
					src="https://analytics.filen.io/js/script.js"
				></script>
			)}
			{isMobileDevice() && <script src="/wsp.js"></script>}
		</Helmet>
	)
})

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)

	root.render(
		<StrictMode>
			<HelmetProvider>
				<HelmetComponent />
				<RouterProvider router={router} />
			</HelmetProvider>
		</StrictMode>
	)
}
