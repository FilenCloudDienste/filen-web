import { memo, useEffect } from "react"
import useIsAuthed from "@/hooks/useIsAuthed"
import { useNavigate } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"

export const RequireUnauthed = memo(({ children }: { children: React.ReactNode }) => {
	const [authed] = useIsAuthed()
	const navigate = useNavigate()
	const { baseFolderUUID } = useSDKConfig()

	useEffect(() => {
		if (authed) {
			navigate({
				to: "/drive/$",
				replace: true,
				resetScroll: true,
				params: {
					_splat: baseFolderUUID
				}
			})
		}
	}, [navigate, authed, baseFolderUUID])

	if (authed) {
		return null
	}

	return children
})

export default RequireUnauthed
