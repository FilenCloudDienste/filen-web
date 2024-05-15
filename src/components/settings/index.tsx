import { memo, useMemo } from "react"
import useLocation from "@/hooks/useLocation"
import General from "./general"
import Account from "./account"
import Security from "./security"
import Invite from "./invite"
import Events from "./events"
import Subscriptions from "./subscriptions"
import Invoices from "./invoices"

export const Settings = memo(() => {
	const location = useLocation()

	const content = useMemo(() => {
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

		if (location.includes("subscriptions")) {
			return <Subscriptions />
		}

		if (location.includes("invoices")) {
			return <Invoices />
		}

		return null
	}, [location])

	return <div className="select-none w-full flex flex-col">{content}</div>
})

export default Settings
