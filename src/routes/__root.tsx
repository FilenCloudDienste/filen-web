import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Fragment } from "react"

export const Route = createRootRoute({
	component: () => (
		<Fragment>
			<Outlet />
			<TanStackRouterDevtools />
		</Fragment>
	)
})
