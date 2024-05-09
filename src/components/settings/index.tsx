import { memo } from "react"
import useLocation from "@/hooks/useLocation"
import General from "./general"
import Account from "./account"
import Security from "./security"
import Invite from "./invite"

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

	return null
})

export default Settings
