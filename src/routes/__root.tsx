import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ThemeProvider } from "@/providers/theme.provider"

export const Route = createRootRoute({
	component: () => (
		<ThemeProvider
			defaultTheme="dark"
			storageKey="filen-ui-theme"
		>
			<Outlet />
			<TanStackRouterDevtools position="bottom-right" />
		</ThemeProvider>
	)
})
