import { memo, useCallback, useEffect } from "react"
import socket from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import { IS_DESKTOP } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useNavigate } from "@tanstack/react-router"
import { Semaphore } from "@/lib/semaphore"
import useLocation from "@/hooks/useLocation"
import useWindowFocus from "@/hooks/useWindowFocus"
import { useChatsStore } from "@/stores/chats.store"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useTranslation } from "react-i18next"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
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
	const { setSelectedConversation, unread } = useChatsStore()
	const [, setLastSelectedChatsConversation] = useLocalStorage<string>("lastSelectedChatsConversation", "")
	const [authed] = useLocalStorage<boolean>("authed", false)
	const { t } = useTranslation()
	const publicLinkURLState = usePublicLinkURLState()
	const { requestsInCount } = useContactsStore()

	const chatConversationsQuery = useQuery({
		queryKey: ["listChatsConversations", authed, publicLinkURLState.isPublicLink],
		queryFn: () => (authed && !publicLinkURLState.isPublicLink ? worker.listChatsConversations() : Promise.resolve([]))
	})

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			if (!authed || publicLinkURLState.isPublicLink) {
				return
			}

			await notificationMutex.acquire()

			try {
				if (
					IS_DESKTOP &&
					event.type === "chatMessageNew" &&
					userId !== event.data.senderId &&
					chatNotificationsEnabled &&
					!triggeredNotificationUUIDs[`chat:${event.data.uuid}`] &&
					(!location.includes(event.data.conversation) || !windowFocus) &&
					chatConversationsQuery.isSuccess
				) {
					triggeredNotificationUUIDs[`chat:${event.data.uuid}`] = true

					let foundConversation: ChatConversation | null = null
					const filteredConversations = chatConversationsQuery.data.filter(c => c.uuid === event.data.conversation)

					if (filteredConversations.length === 1 && filteredConversations[0]) {
						foundConversation = filteredConversations[0]
					} else {
						const fetchedConversations = await worker.listChatsConversations()
						const filteredFetchedConversations = fetchedConversations.filter(c => c.uuid === event.data.conversation)

						if (filteredFetchedConversations.length === 1 && filteredFetchedConversations[0]) {
							foundConversation = filteredFetchedConversations[0]
						}
					}

					if (!foundConversation) {
						return
					}

					const chatKey = await worker.chatKey({ conversation: event.data.conversation })
					const messageDecrypted = await worker.decryptChatMessage({ message: event.data.message, key: chatKey })

					if (!messageDecrypted || messageDecrypted.length === 0) {
						return
					}

					const notification = new window.Notification(t("notifications.chat"), {
						body: `${event.data.senderNickName.length > 0 ? event.data.senderNickName : event.data.senderEmail}: ${messageDecrypted}`,
						silent: true,
						icon: notificationIcon
					})

					notification.addEventListener(
						"click",
						async () => {
							await window.desktopAPI.showWindow().catch(console.error)

							if (!foundConversation) {
								return
							}

							setLastSelectedChatsConversation(foundConversation.uuid)
							setSelectedConversation(foundConversation)

							navigate({
								to: "/chats/$uuid",
								params: {
									uuid: foundConversation.uuid
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

				if (
					event.type === "contactRequestReceived" &&
					IS_DESKTOP &&
					contactNotificationsEnabled &&
					(!location.includes("contacts") || !windowFocus) &&
					!triggeredNotificationUUIDs[`contactRequest:${event.data.uuid}`]
				) {
					const notification = new window.Notification(t("notifications.contactRequest"), {
						body: t("notifications.contactRequestInfo", {
							name: (event.data.senderNickName ?? "").length > 0 ? event.data.senderNickName : event.data.senderEmail
						}),
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

					notification.addEventListener(
						"hide",
						() => {
							delete triggeredNotificationUUIDs[`contactRequest:${event.data.uuid}`]
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
		[
			userId,
			chatNotificationsEnabled,
			navigate,
			location,
			windowFocus,
			chatConversationsQuery.isSuccess,
			chatConversationsQuery.data,
			setLastSelectedChatsConversation,
			setSelectedConversation,
			contactNotificationsEnabled,
			authed,
			publicLinkURLState.isPublicLink,
			t
		]
	)

	useEffect(() => {
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement

		if (!link) {
			return
		}

		const oldHref = link.href
		const newHref = unread + requestsInCount > 0 ? "./notification-favicon.ico" : "./favicon.ico"

		if (newHref === oldHref) {
			return
		}

		link.href = newHref
	}, [unread, requestsInCount])

	useEffect(() => {
		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	return children
})

export default NotificationHandler
