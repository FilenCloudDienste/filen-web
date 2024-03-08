import { useRouterState } from "@tanstack/react-router"
import { useMemo } from "react"

export default function useRouteParent() {
	const routerState = useRouterState()

	const routeParent = useMemo(() => {
		if (routerState.location.pathname.includes("/")) {
			const ex = routerState.location.pathname.split("/")

			return ex[ex.length - 1]
		}

		return routerState.location.pathname
	}, [routerState.location.pathname])

	return routeParent
}
