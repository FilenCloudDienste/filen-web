import { memo } from "react"
import { useRouterState } from "@tanstack/react-router"
import General from "./general"

export const Settings = memo(() => {
	const routerState = useRouterState()

	if (routerState.location.pathname.includes("general")) {
		return <General />
	}

	return null
})

export default Settings
