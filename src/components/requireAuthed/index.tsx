import { memo, useEffect } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useNavigate } from "@tanstack/react-router"

export const RequireAuth = memo(({ children }: { children: React.ReactNode }) => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const navigate = useNavigate()

	useEffect(() => {
		if (!authed) {
			navigate({
				to: "/login",
				replace: true,
				resetScroll: true
			})
		}
	}, [navigate, authed])

	if (!authed) {
		return null
	}

	return children
})

export default RequireAuth
