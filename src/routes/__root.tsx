import { ThemeProvider } from "@/providers/themeProvider"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { lazy, Suspense, memo } from "react"
import { Toaster } from "@/components/ui/toaster"

//const TanStackRouterDevtools =
process.env.NODE_ENV === "production"
	? () => null
	: lazy(() =>
			import("@tanstack/router-devtools").then(res => ({
				default: res.TanStackRouterDevtools
			}))
		)

export const Root = memo(() => {
	return (
		<ThemeProvider>
			<Outlet />
			<Toaster />
			{process.env.NODE_ENV === "development" && (
				<Suspense fallback={<></>}>
					<></>
				</Suspense>
			)}
		</ThemeProvider>
	)
})

export const Route = createRootRoute({
	component: Root,
	notFoundComponent: () => <div>404</div>
})
