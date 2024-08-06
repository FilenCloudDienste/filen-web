import { memo, useEffect } from "react"
import useIsAuthed from "@/hooks/useIsAuthed"
import { useNavigate } from "@tanstack/react-router"

export const RequireAuth = memo(({ children }: { children: React.ReactNode }) => {
	const [authed] = useIsAuthed()
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
