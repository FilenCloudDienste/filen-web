import { memo, useCallback, useState, useMemo, useEffect } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type UseQueryResult } from "@tanstack/react-query"
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

export const MarkAsRead = memo(
	({
		conversation,
		lastFocusQuery,
		lastFocus,
		messagesSorted
	}: {
		conversation: ChatConversation
		lastFocusQuery: UseQueryResult<ChatLastFocusValues[], Error>
		lastFocus: number
		messagesSorted: ChatMessage[]
	}) => {
		const inputContainerDimensions = useElementDimensions("chat-input-container")
		const [markingAsRead, setMarkingAsRead] = useState<boolean>(false)
		const { userId } = useSDKConfig()
		const { t } = useTranslation()
		const { setConversationsUnread } = useChatsStore()

		const { show, count, since } = useMemo(() => {
			if (messagesSorted.length === 0) {
				return {
					show: false,
					count: 0,
					since: simpleDate(Date.now())
				}
			}

			const messagesSinceLastFocus = messagesSorted.filter(message => message.sentTimestamp > lastFocus)

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
				show: (messagesSorted.at(-1)?.sentTimestamp ?? Date.now()) > lastFocus,
				count: messagesFromOthers.length,
				since: simpleDate(messagesSorted.at(0)?.sentTimestamp ?? Date.now())
			}
		}, [messagesSorted, lastFocus, userId])

		const markAsRead = useCallback(async () => {
			if (!lastFocusQuery.isSuccess || count === 0) {
				return
			}

			setMarkingAsRead(true)

			try {
				await Promise.all([
					worker.chatUpdateLastFocus({
						values: lastFocusQuery.data.map(lf => (lf.uuid === conversation.uuid ? { ...lf, lastFocus: Date.now() } : lf))
					}),
					worker.chatMarkConversationAsRead({ conversation: conversation.uuid })
				])

				await lastFocusQuery.refetch()

				setConversationsUnread(prev => {
					const newRecord = { ...prev }

					delete newRecord[conversation.uuid]

					return newRecord
				})

				eventEmitter.emit("updateChatsUnreadCount")
			} catch (e) {
				console.error(e)
			} finally {
				setMarkingAsRead(false)
			}
		}, [lastFocusQuery, conversation.uuid, count, setConversationsUnread])

		useEffect(() => {
			const chatMarkAsReadListener = eventEmitter.on("chatMarkAsRead", markAsRead)

			return () => {
				chatMarkAsReadListener.remove()
			}
		}, [markAsRead])

		if (!show) {
			return null
		}

		return (
			<div
				className="absolute h-auto bg-indigo-500 mt-12 z-50 px-2 py-1 rounded-b-lg flex flex-row items-center justify-between cursor-pointer whitespace-nowrap gap-4"
				style={{
					width: inputContainerDimensions.width
				}}
				onClick={markAsRead}
			>
				<p className="line-clamp-1 text-ellipsis break-all flex flex-row items-center">
					{t(count <= 1 ? "chats.newMessageSince" : "chats.newMessagesSince", { count: count >= 99 ? 99 : count, since })}
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
