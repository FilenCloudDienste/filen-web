import { memo } from "react"
import useLocation from "@/hooks/useLocation"
import General from "./general"
import Account from "./account"
import Security from "./security"

export const Settings = memo(() => {
	const location = useLocation()

	if (location.includes("general")) {
		return <General />
	}

	if (location.includes("account")) {
		return <Account />
	}

	if (location.includes("security")) {
		return <Security />
	}

	return null
})

export default Settings
