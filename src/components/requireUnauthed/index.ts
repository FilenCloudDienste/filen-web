import { memo, useEffect } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useNavigate } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"

export const RequireUnauthed = memo(({ children }: { children: React.ReactNode }) => {
	const [authed] = useLocalStorage<boolean>("authed", false)
	const navigate = useNavigate()
	const sdkConfig = useSDKConfig()

	useEffect(() => {
		if (authed) {
			navigate({
				to: "/drive/$",
				replace: true,
				resetScroll: true,
				params: {
					_splat: sdkConfig.baseFolderUUID
				}
			})
		}
	}, [navigate, authed, sdkConfig])

	if (authed) {
		return null
	}

	return children
})

export default RequireUnauthed
