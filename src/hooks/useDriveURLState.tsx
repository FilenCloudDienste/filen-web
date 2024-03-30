import { useMemo } from "react"
import { useRouterState } from "@tanstack/react-router"
import useRouteParent from "./useRouteParent"

export default function useDriveURLState() {
	const routerState = useRouterState()
	const parent = useRouteParent()

	const urlState = useMemo(() => {
		return {
			drive: routerState.location.pathname.includes("drive"),
			trash: routerState.location.pathname.includes("trash"),
			recents: routerState.location.pathname.includes("recents"),
			favorites: routerState.location.pathname.includes("favorites"),
			sharedIn: routerState.location.pathname.includes("shared-in"),
			sharedOut: routerState.location.pathname.includes("shared-out"),
			links: routerState.location.pathname.includes("links"),
			insideParent: parent.length === 36
		}
	}, [routerState.location.pathname, parent])

	return urlState
}
