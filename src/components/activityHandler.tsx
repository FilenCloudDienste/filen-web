import { memo, useCallback, useEffect, useRef, useMemo } from "react"
import useWindowFocus from "@/hooks/useWindowFocus"
import worker from "@/lib/worker"
import useLocation from "@/hooks/useLocation"
import useMountedEffect from "@/hooks/useMountedEffect"
import useErrorToast from "@/hooks/useErrorToast"
import { getSocket } from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import { logout } from "@/lib/setup"
import useIsAuthed from "@/hooks/useIsAuthed"
import { getSDK } from "@/lib/sdk"

export const ActivityHandler = memo(() => {
	const windowFocus = useWindowFocus()
	const nextLastActiveDesktopUpdate = useRef<number>(-1)
	const isUpdatingLastActiveDesktop = useRef<boolean>(false)
	const location = useLocation()
	const [authed] = useIsAuthed()
	const errorToast = useErrorToast()

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

	const logoutFn = useCallback(async () => {
		if (!authed || window.disableInvalidAPIKeyLogout) {
			return
		}

		try {
			await logout()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [errorToast, authed])

	const loggedOutCheck = useCallback(async () => {
		if (!authed) {
			return
		}

		try {
			const sdk = getSDK()

			if (typeof sdk.config.apiKey !== "string" || (typeof sdk.config.apiKey === "string" && sdk.config.apiKey.length <= 16)) {
				return
			}

			const isAPIKeyValid = await sdk.user().checkAPIKeyValidity()

			if (!isAPIKeyValid) {
				await logoutFn()

				return
			}

			setTimeout(loggedOutCheck, 15000)
		} catch (e) {
			console.error(e)
		}
	}, [authed, logoutFn])

	const socketEventListener = useCallback(
		(event: SocketEvent) => {
			if (event.type === "passwordChanged") {
				logoutFn()
			}
		},
		[logoutFn]
	)

	useEffect(() => {
		const updateLastActiveDesktopInterval = setInterval(update, 1000)
		const socket = getSocket()

		socket.addListener("socketEvent", socketEventListener)

		return () => {
			clearInterval(updateLastActiveDesktopInterval)

			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [update, socketEventListener])

	useMountedEffect(() => {
		loggedOutCheck()
	})

	return null
})

export default ActivityHandler
