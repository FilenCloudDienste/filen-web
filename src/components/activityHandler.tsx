import { memo, useCallback, useEffect, useRef, useMemo } from "react"
import useWindowFocus from "@/hooks/useWindowFocus"
import worker from "@/lib/worker"
import useLocation from "@/hooks/useLocation"
import useMountedEffect from "@/hooks/useMountedEffect"
import { useNavigate } from "@tanstack/react-router"
import useErrorToast from "@/hooks/useErrorToast"
import { IS_DESKTOP } from "@/constants"
import socket from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import { logout } from "@/lib/setup"
import useIsAuthed from "@/hooks/useIsAuthed"

export const ActivityHandler = memo(() => {
	const windowFocus = useWindowFocus()
	const nextLastActiveDesktopUpdate = useRef<number>(-1)
	const isUpdatingLastActiveDesktop = useRef<boolean>(false)
	const location = useLocation()
	const [authed] = useIsAuthed()
	const errorToast = useErrorToast()
	const navigate = useNavigate()

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
		if (!authed) {
			return
		}

		try {
			await logout()

			if (IS_DESKTOP) {
				await window.desktopAPI.restart()
			} else {
				navigate({
					to: "/login",
					replace: true,
					resetScroll: true
				})
			}
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [errorToast, navigate, authed])

	const loggedOutCheck = useCallback(async () => {
		if (!authed) {
			return
		}

		try {
			await worker.fetchAccount()

			setTimeout(loggedOutCheck, 15000)
		} catch (e) {
			console.error(e)

			if (e instanceof Error && e.message.toLowerCase().includes("api") && e.message.toLowerCase().includes("key")) {
				logoutFn()
			}
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
