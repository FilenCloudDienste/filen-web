import { memo, useCallback, useState, useMemo, useEffect } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import worker from "@/lib/worker"
import useElementDimensions from "@/hooks/useElementDimensions"
import { Loader, Check } from "lucide-react"
import { type ChatLastFocusValues } from "@filen/sdk/dist/types/api/v3/chat/lastFocusUpdate"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useTranslation } from "react-i18next"
import { simpleDate } from "@/utils"
import eventEmitter from "@/lib/eventEmitter"
import { useChatsStore } from "@/stores/chats.store"
import useRouteParent from "@/hooks/useRouteParent"

export const MarkAsRead = memo(
	({
		conversation,
		setLastFocus,
		lastFocus,
		messagesSorted,
		lastFocusValues
	}: {
		conversation: ChatConversation
		setLastFocus: React.Dispatch<React.SetStateAction<number>>
		lastFocus: number
		messagesSorted: ChatMessage[]
		lastFocusValues: ChatLastFocusValues[]
	}) => {
		const inputContainerDimensions = useElementDimensions("chat-input-container")
		const [markingAsRead, setMarkingAsRead] = useState<boolean>(false)
		const { userId } = useSDKConfig()
		const { t } = useTranslation()
		const { setConversationsUnread } = useChatsStore()
		const routeParent = useRouteParent()

		const { show, count, since } = useMemo(() => {
			if (messagesSorted.length === 0) {
				return {
					show: false,
					count: 0,
					since: ""
				}
			}

			const messagesSinceLastFocus = messagesSorted.filter(
				message => message.sentTimestamp > lastFocus && routeParent === message.conversation
			)

			if (messagesSinceLastFocus.length === 0) {
				return {
					show: false,
					count: 0,
					since: simpleDate(Date.now())
				}
			}

			const messagesFromOthers = messagesSinceLastFocus.filter(message => message.senderId !== userId)

			if (messagesFromOthers.length === 0) {
				return {
					show: false,
					count: 0,
					since: simpleDate(Date.now())
				}
			}

			return {
				show: true,
				count: messagesFromOthers.length,
				since: simpleDate(messagesSinceLastFocus.at(0)?.sentTimestamp ?? Date.now())
			}
		}, [messagesSorted, lastFocus, userId, routeParent])

		const markAsRead = useCallback(async () => {
			setMarkingAsRead(true)

			try {
				const now = Date.now()
				const oldValues = lastFocusValues
				const values: ChatLastFocusValues[] = []
				let exists = false

				for (const value of oldValues) {
					if (value.uuid === conversation.uuid) {
						values.push({
							...value,
							lastFocus: now
						})

						exists = true
					}
				}

				if (!exists) {
					values.push({
						uuid: conversation.uuid,
						lastFocus: now
					})
				}

				await Promise.all([
					worker.chatUpdateLastFocus({ values }),
					worker.chatMarkConversationAsRead({ conversation: conversation.uuid })
				])

				setLastFocus(now)
				setConversationsUnread(prev => ({
					...prev,
					[conversation.uuid]: 0
				}))

				eventEmitter.emit("updateChatsUnreadCount")
				eventEmitter.emit("scrollChatToBottom")
			} catch (e) {
				console.error(e)
			} finally {
				setMarkingAsRead(false)
			}
		}, [conversation.uuid, setConversationsUnread, lastFocusValues, setLastFocus])

		useEffect(() => {
			const chatMarkAsReadListener = eventEmitter.on("chatMarkAsRead", markAsRead)

			return () => {
				chatMarkAsReadListener.remove()
			}
		}, [markAsRead])

		if (!show || count === 0) {
			return null
		}

		return (
			<div
				className="absolute h-auto bg-indigo-500 mt-12 z-50 px-2 py-1 rounded-b-lg flex flex-row items-center justify-between cursor-pointer whitespace-nowrap gap-4 select-none opacity-95 text-white"
				style={{
					width: inputContainerDimensions.width
				}}
				onClick={markAsRead}
			>
				<p className="line-clamp-1 text-ellipsis break-all flex flex-row items-center">
					{t(count <= 1 ? "chats.newMessageSince" : "chats.newMessagesSince", {
						count: count,
						since
					})}
				</p>
				<p className="line-clamp-1 text-ellipsis break-all flex flex-row items-center gap-2 shrink-0">
					{markingAsRead ? (
						<Loader
							className="animate-spin-medium"
							size={18}
						/>
					) : (
						<>
							{t("chats.markAsRead")}
							<Check size={18} />
						</>
					)}
				</p>
			</div>
		)
	}
)

export default MarkAsRead
