import { memo, useMemo, useCallback, useState, useEffect } from "react"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { ReplaceMessageWithComponents, isTimestampSameDay, isTimestampSameMinute, MENTION_REGEX, formatMessageDate } from "./utils"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import Avatar from "@/components/avatar"
import ContextMenu from "./contextMenu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import eventEmitter from "@/lib/eventEmitter"
import { type TFunction } from "i18next"

export const DateDivider = memo(({ timestamp }: { timestamp: number }) => {
	return (
		<div className="flex flex-row justify-between gap-1 px-4 items-center pb-4">
			<div className="flex h-[1px] bg-border w-full" />
			<p className="text-sm text-muted-foreground break-keep px-2 whitespace-nowrap">{new Date(timestamp).toDateString()}</p>
			<div className="flex h-[1px] bg-border w-full" />
		</div>
	)
})

export const NewDivider = memo(() => {
	const markAsRead = useCallback(() => {
		eventEmitter.emit("chatMarkAsRead")
	}, [])

	return (
		<div className="flex flex-row justify-between px-4 items-center pb-4">
			<div className="flex h-[1px] bg-red-500 w-full" />
			<p
				className="text-sm text-muted-foreground break-keep px-2 whitespace-nowrap bg-red-500 rounded-md text-white cursor-pointer"
				onClick={markAsRead}
			>
				NEW
			</p>
		</div>
	)
})

export const Time = memo(({ timestamp, t }: { timestamp: number; t: TFunction<"translation", undefined> }) => {
	const [date, setDate] = useState<{ simple: string; full: string }>({
		simple: formatMessageDate(timestamp, t),
		full: new Date(timestamp).toLocaleString()
	})

	useEffect(() => {
		const interval = setInterval(() => {
			setDate({
				simple: formatMessageDate(timestamp, t),
				full: new Date(timestamp).toLocaleString()
			})
		}, 5000)

		return () => {
			clearInterval(interval)
		}
	}, [timestamp, t])

	return (
		<TooltipProvider delayDuration={750}>
			<Tooltip>
				<TooltipTrigger asChild={true}>
					<p className="text-muted-foreground text-xs cursor-default">{date.simple}</p>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p>{date.full}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
})

export const Message = memo(
	({
		message,
		conversation,
		prevMessage,
		nextMessage,
		userId,
		isScrolling,
		lastFocus,
		t,
		failedMessages,
		editUUID,
		replyUUID
	}: {
		message: ChatMessage
		conversation: ChatConversation
		prevMessage: ChatMessage
		nextMessage: ChatMessage
		userId: number
		isScrolling: boolean
		lastFocus: number
		t: TFunction<"translation", undefined>
		failedMessages: string[]
		editUUID: string
		replyUUID: string
	}) => {
		const [hovering, setHovering] = useState<boolean>(false)

		const groupWithPrevMessage = useMemo((): boolean => {
			if (!prevMessage) {
				return false
			}

			return prevMessage.senderId === message.senderId && isTimestampSameMinute(message.sentTimestamp, prevMessage.sentTimestamp)
		}, [message, prevMessage])

		const prevMessageSameDay = useMemo((): boolean => {
			if (!prevMessage) {
				return true
			}

			return isTimestampSameDay(prevMessage.sentTimestamp, message.sentTimestamp)
		}, [prevMessage, message])

		const mentioningMe = useMemo((): boolean => {
			const matches = message.message.match(MENTION_REGEX)

			if (!matches || matches.length === 0) {
				return false
			}

			const userEmail = conversation.participants.filter(p => p.userId === userId)

			if (userEmail.length === 0) {
				return false
			}

			return (
				matches.filter(match => {
					const email = match.trim().slice(1)

					if (email === "everyone") {
						return true
					}

					if (email.startsWith("@") || email.endsWith("@")) {
						return false
					}

					return userEmail[0].email === email
				}).length > 0
			)
		}, [message, userId, conversation.participants])

		const isNewMessage = useMemo((): boolean => {
			return message.sentTimestamp > lastFocus && message.senderId !== userId
		}, [message.sentTimestamp, message.senderId, lastFocus, userId])

		const didMessageFail = useMemo((): boolean => {
			return failedMessages.some(uuid => uuid === message.uuid)
		}, [failedMessages, message.uuid])

		return (
			<>
				{!prevMessage && <div className="flex flex-row p-1 px-5 gap-4">end to end encrypted chat</div>}
				{((prevMessage && !groupWithPrevMessage) || !prevMessage) && (
					<div
						style={{
							height: 16
						}}
					/>
				)}
				{message.sentTimestamp > lastFocus &&
					message.senderId !== userId &&
					!(prevMessage && prevMessage.sentTimestamp > lastFocus) && <NewDivider />}
				{(!prevMessageSameDay || !prevMessage) && <DateDivider timestamp={message.sentTimestamp} />}
				<ContextMenu
					message={message}
					setHovering={setHovering}
				>
					<div
						className={cn(
							"flex flex-row border-l-2 animate-in animate-out transition-all",
							hovering ? (mentioningMe ? "bg-yellow-600 bg-opacity-10" : "bg-primary-foreground") : "",
							!groupWithPrevMessage ? "p-1 px-5 gap-4" : "p-1 px-5 pl-[73px]",
							isNewMessage
								? "border-red-500 bg-primary-foreground"
								: mentioningMe
									? cn(
											"border-yellow-500 bg-yellow-500 bg-opacity-10",
											!isScrolling && "hover:bg-yellow-600 hover:bg-opacity-20"
										)
									: replyUUID === message.uuid || editUUID === message.uuid
										? "border-indigo-500 bg-primary-foreground"
										: cn("border-transparent", !isScrolling && "hover:bg-primary-foreground")
						)}
					>
						{!groupWithPrevMessage && (
							<div className="flex flex-col">
								<Avatar
									className="w-9 h-9"
									src={message.senderAvatar}
									fallback={message.senderEmail}
								/>
							</div>
						)}
						<div className={cn("flex flex-col", !groupWithPrevMessage ? "gap-[1px]" : "")}>
							{!groupWithPrevMessage && (
								<div className="flex flex-row gap-2 items-center">
									<p className="cursor-pointer hover:underline">{message.senderNickName}</p>
									<Time
										timestamp={message.sentTimestamp}
										t={t}
									/>
								</div>
							)}
							<div className="flex flex-row">
								<ReplaceMessageWithComponents
									content={message.message}
									participants={conversation.participants}
									failed={didMessageFail}
									edited={message.edited}
									t={t}
								/>
							</div>
						</div>
					</div>
				</ContextMenu>
				{!nextMessage && (
					<div
						style={{
							height: 16
						}}
					/>
				)}
			</>
		)
	}
)

export default Message
