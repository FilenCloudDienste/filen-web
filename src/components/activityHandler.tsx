import { memo, useCallback, useEffect, useRef } from "react"
import useWindowFocus from "@/hooks/useWindowFocus"
import worker from "@/lib/worker"

export const ActivityHandler = memo(({ children }: { children: React.ReactNode }) => {
	const windowFocus = useWindowFocus()
	const nextLastActiveDesktopUpdate = useRef<number>(-1)
	const isUpdatingLastActiveDesktop = useRef<boolean>(false)

	const update = useCallback(async () => {
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
	}, [windowFocus])

	useEffect(() => {
		const updateLastActiveDesktopInterval = setInterval(update, 1000)

		return () => {
			clearInterval(updateLastActiveDesktopInterval)
		}
	}, [update])

	return children
})

export default ActivityHandler
