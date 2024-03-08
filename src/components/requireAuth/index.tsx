import { memo, useEffect } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useNavigate } from "@tanstack/react-router"

export const RequireAuth = memo(({ children }: { children: React.ReactNode }) => {
	const [isAuthed] = useLocalStorage<boolean>("isAuthed", false)
	const navigate = useNavigate()

	useEffect(() => {
		if (!isAuthed) {
			navigate({
				to: "/login"
			})
		}
	}, [navigate, isAuthed])

	if (!isAuthed) {
		return null
	}

	return children
})

export default RequireAuth
