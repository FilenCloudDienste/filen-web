import { memo } from "react"
import useLocation from "@/hooks/useLocation"
import General from "./general"
import Account from "./account"
import Security from "./security"
import Invite from "./invite"
import Events from "./events"

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

	if (location.includes("invite")) {
		return <Invite />
	}

	if (location.includes("events")) {
		return <Events />
	}

	return null
})

export default Settings
