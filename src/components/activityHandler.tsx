import { memo, useCallback, useEffect, useRef, useMemo } from "react"
import useWindowFocus from "@/hooks/useWindowFocus"
import worker from "@/lib/worker"
import { useLocalStorage } from "@uidotdev/usehooks"
import useLocation from "@/hooks/useLocation"

export const ActivityHandler = memo(({ children }: { children: React.ReactNode }) => {
	const windowFocus = useWindowFocus()
	const nextLastActiveDesktopUpdate = useRef<number>(-1)
	const isUpdatingLastActiveDesktop = useRef<boolean>(false)
	const location = useLocation()
	const [authed] = useLocalStorage<boolean>("authed", false)

	const isInsidePublicLink = useMemo(() => {
		return location.includes("/f/") || location.includes("/d/")
	}, [location])

	const update = useCallback(async () => {
		if (isInsidePublicLink || !authed) {
			return
		}

		const now = Date.now()

		if (!windowFocus || now < nextLastActiveDesktopUpdate.current || isUpdatingLastActiveDesktop.current) {
			return
		}

		isUpdatingLastActiveDesktop.current = true

		try {
			await worker.updateDesktopLastActive({ timestamp: now })

			nextLastActiveDesktopUpdate.current = now + 15000
		} catch (e) {
			console.error(e)
		} finally {
			isUpdatingLastActiveDesktop.current = false
		}
	}, [windowFocus, isInsidePublicLink, authed])

	useEffect(() => {
		const updateLastActiveDesktopInterval = setInterval(update, 1000)

		return () => {
			clearInterval(updateLastActiveDesktopInterval)
		}
	}, [update])

	return children
})

export default ActivityHandler
