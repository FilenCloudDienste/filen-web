import { memo } from "react"
import useLocation from "@/hooks/useLocation"
import General from "./general"

export const Settings = memo(() => {
	const location = useLocation()

	if (location.includes("general")) {
		return <General />
	}

	return null
})

export default Settings
