import { memo, useEffect } from "react"
import useIsAuthed from "@/hooks/useIsAuthed"
import { useNavigate } from "@tanstack/react-router"

export const RequireAuth = memo(({ children }: { children: React.ReactNode }) => {
	const [authed] = useIsAuthed()
	const navigate = useNavigate()

	useEffect(() => {
		if (!authed) {
			const redirectToPlanId = window.location.href.includes("plans?id=") ? window.location.href.split("plans?id=")[1] : null

			navigate({
				to: redirectToPlanId ? `/login?planId=${redirectToPlanId}` : "/login",
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
