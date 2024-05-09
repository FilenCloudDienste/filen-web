import { memo, useCallback, useEffect, useRef } from "react"
import socket from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import { IS_DESKTOP } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useNavigate } from "@tanstack/react-router"
import { Semaphore } from "@/lib/semaphore"
import useLocation from "@/hooks/useLocation"
import useWindowFocus from "@/hooks/useWindowFocus"
import { useContactsStore } from "@/stores/contacts.store"

export const triggeredNotificationUUIDs: Record<string, boolean> = {}
export const notificationMutex = new Semaphore(1)
export const notificationIcon = ""

export const NotificationHandler = memo(({ children }: { children: React.ReactNode }) => {
	const [chatNotificationsEnabled] = useLocalStorage<boolean>("chatNotificationsEnabled", false)
	const [contactNotificationsEnabled] = useLocalStorage<boolean>("contactNotificationsEnabled", false)
	const { userId } = useSDKConfig()
	const navigate = useNavigate()
	const location = useLocation()
	const windowFocus = useWindowFocus()
	const { requestsInCount } = useContactsStore()
	const currentRequestsInCountRef = useRef<number>(requestsInCount)

	const handleContactsNotifications = useCallback(async () => {
		await notificationMutex.acquire()

		try {
			if (requestsInCount === 0 || currentRequestsInCountRef.current === requestsInCount) {
				currentRequestsInCountRef.current = requestsInCount

				return
			}

			currentRequestsInCountRef.current = requestsInCount

			if (IS_DESKTOP && contactNotificationsEnabled && (!location.includes("contacts") || !windowFocus)) {
				const notification = new window.Notification("contacts", {
					body: "new request",
					silent: true,
					icon: notificationIcon
				})

				notification.addEventListener(
					"click",
					async () => {
						await window.desktopAPI.showWindow().catch(console.error)

						navigate({
							to: "/contacts/$type",
							params: {
								type: "in"
							}
						})
					},
					{
						once: true
					}
				)
			}
		} catch (e) {
			console.error(e)
		} finally {
			notificationMutex.release()
		}
	}, [requestsInCount, location, contactNotificationsEnabled, navigate, windowFocus])

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			await notificationMutex.acquire()

			try {
				if (
					IS_DESKTOP &&
					event.type === "chatMessageNew" &&
					userId !== event.data.senderId &&
					chatNotificationsEnabled &&
					!triggeredNotificationUUIDs[`chat:${event.data.uuid}`] &&
					(!location.includes(event.data.conversation) || !windowFocus)
				) {
					triggeredNotificationUUIDs[`chat:${event.data.uuid}`] = true

					const notification = new window.Notification("chat", {
						body: "message",
						silent: true,
						icon: notificationIcon
					})

					notification.addEventListener(
						"click",
						async () => {
							await window.desktopAPI.showWindow().catch(console.error)

							navigate({
								to: "/chats/$uuid",
								params: {
									uuid: event.data.conversation
								}
							})
						},
						{
							once: true
						}
					)

					notification.addEventListener(
						"hide",
						() => {
							delete triggeredNotificationUUIDs[`chat:${event.data.uuid}`]
						},
						{
							once: true
						}
					)
				}
			} catch (e) {
				console.error(e)
			} finally {
				notificationMutex.release()
			}
		},
		[userId, chatNotificationsEnabled, navigate, location, windowFocus]
	)

	useEffect(() => {
		if (requestsInCount > 0) {
			handleContactsNotifications()
		} else {
			currentRequestsInCountRef.current = requestsInCount
		}
	}, [requestsInCount, handleContactsNotifications])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	return children
})

export default NotificationHandler
