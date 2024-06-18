import { memo, useMemo, useCallback, useState, useEffect, useRef } from "react"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import {
	ReplaceMessageWithComponents,
	isTimestampSameDay,
	isTimestampSameMinute,
	MENTION_REGEX,
	formatMessageDate,
	ReplaceMessageWithComponentsInline,
	getMessageDisplayType,
	type MessageDisplayType,
	extractLinksFromString
} from "./utils"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import Avatar from "@/components/avatar"
import ContextMenu from "./contextMenu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import eventEmitter from "@/lib/eventEmitter"
import { type TFunction } from "i18next"
import { Reply, MoreHorizontal, Edit, Lock, CheckCircle } from "lucide-react"
import useMountedEffect from "@/hooks/useMountedEffect"
import worker from "@/lib/worker"
import YouTube from "./embeds/youTube"
import X from "./embeds/x"
import Image from "./embeds/image"
import OG from "./embeds/og"
import Async from "./embeds/async"
import { chatDisplayMessageAsCache, chatOGDataCache } from "@/cache"
import Filen from "./embeds/filen"
import { useTranslation } from "react-i18next"
import useSDKConfig from "@/hooks/useSDKConfig"
import { useChatsStore } from "@/stores/chats.store"

export const EMBED_CONTENT_TYPES_IMAGES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/svg",
	"image/gifv",
	"image/webp",
	"image/svg+xml",
	"image/bmp",
	"image/tiff",
	"image/vnd.microsoft.icon",
	"image/x-icon",
	"image/jp2",
	"image/jpx",
	"image/x-xbitmap",
	"image/avif"
]

export const Header = memo(() => {
	const { t } = useTranslation()

	return (
		<div className="flex flex-col gap-1">
			<p className="text-xl">{t("chats.header.title")}</p>
			<p className="text-muted-foreground">{t("chats.header.description")}</p>
			<div className="flex flex-row gap-2 items-center mt-3">
				<Lock
					className="shrink-0"
					size={22}
				/>
				<p className="text-muted-foreground">{t("chats.header.feature1")}</p>
			</div>
			<div className="flex flex-row gap-2 items-center mt-2">
				<CheckCircle
					className="shrink-0"
					size={22}
				/>
				<p className="text-muted-foreground">{t("chats.header.feature2")}</p>
			</div>
		</div>
	)
})

export const DateDivider = memo(({ timestamp }: { timestamp: number }) => {
	return (
		<div className="flex flex-row justify-between gap-1 px-4 items-center pb-4">
			<div className="flex h-[1px] bg-border w-full" />
			<p className="text-sm text-muted-foreground break-keep px-2 whitespace-nowrap">{new Date(timestamp).toDateString()}</p>
			<div className="flex h-[1px] bg-border w-full" />
		</div>
	)
})

export const NewDivider = memo(({ t }: { t: TFunction<"translation", undefined> }) => {
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
				{t("new")}
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
		isScrolling,
		lastFocus
	}: {
		message: ChatMessage
		conversation: ChatConversation
		prevMessage?: ChatMessage
		nextMessage?: ChatMessage
		isScrolling: boolean
		lastFocus: number
	}) => {
		const { failedMessages, setReplyMessage, setEditUUID, editUUID, replyMessage } = useChatsStore()
		const { t } = useTranslation()
		const { userId } = useSDKConfig()
		const [hovering, setHovering] = useState<boolean>(false)
		const ref = useRef<HTMLDivElement>(null)
		const links = useRef<string[]>(extractLinksFromString(message.message)).current
		const initialDisplayAs = useRef<Record<string, MessageDisplayType>>(
			chatDisplayMessageAsCache.has(message.uuid)
				? chatDisplayMessageAsCache.get(message.uuid)!
				: links.reduce((obj, link) => ({ ...obj, [link]: getMessageDisplayType(link) }), {})
		).current
		const [displayAs, setDisplayAs] = useState<Record<string, MessageDisplayType>>(initialDisplayAs)
		const [ogData, setOGData] = useState<Record<string, Record<string, string>>>(
			chatOGDataCache.has(message.uuid) ? chatOGDataCache.get(message.uuid)! : {}
		)

		const replyUUID = useMemo(() => {
			return replyMessage ? replyMessage.uuid : ""
		}, [replyMessage])

		const groupWithPrevMessage = useMemo((): boolean => {
			if (!prevMessage) {
				return false
			}

			return prevMessage.senderId === message.senderId && isTimestampSameMinute(prevMessage.sentTimestamp, message.sentTimestamp)
		}, [message, prevMessage])

		const prevMessageSameDay = useMemo((): boolean => {
			if (!prevMessage) {
				return true
			}

			return isTimestampSameDay(prevMessage.sentTimestamp, message.sentTimestamp)
		}, [prevMessage, message])

		const mentioningMe = useMemo((): boolean => {
			if (message.replyTo && message.replyTo.senderId === userId) {
				return true
			}

			const matches = message.message.match(MENTION_REGEX)

			if (!matches || matches.length === 0) {
				return false
			}

			const userEmail = conversation.participants.filter(p => p.userId === userId)

			if (userEmail.length === 0 || !userEmail[0]) {
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

					return userEmail[0]!.email === email
				}).length > 0
			)
		}, [message, userId, conversation.participants])

		const isNewMessage = useMemo((): boolean => {
			return message.sentTimestamp > lastFocus && message.senderId !== userId
		}, [message.sentTimestamp, message.senderId, lastFocus, userId])

		const didMessageFail = useMemo((): boolean => {
			return failedMessages.some(uuid => uuid === message.uuid)
		}, [failedMessages, message.uuid])

		const triggerMoreIconContextMenu = useCallback(
			(e: React.MouseEvent<SVGSVGElement, MouseEvent> | React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				e.preventDefault()
				e.stopPropagation()

				const contextMenuEvent = new MouseEvent("contextmenu", {
					bubbles: true,
					cancelable: true,
					view: window,
					clientX: e.clientX,
					clientY: e.clientY
				})

				ref.current?.dispatchEvent(contextMenuEvent)
				e.currentTarget.dispatchEvent(contextMenuEvent)
			},
			[]
		)

		const reply = useCallback(() => {
			setReplyMessage(message)
			setEditUUID("")

			eventEmitter.emit("chatInputFocus")
		}, [message, setReplyMessage, setEditUUID])

		const edit = useCallback(() => {
			setEditUUID(message.uuid)
			setReplyMessage(null)

			eventEmitter.emit("chatInputWriteText", message.message)
		}, [message.uuid, setEditUUID, message.message, setReplyMessage])

		const className = useMemo(() => {
			return cn(
				"flex flex-row border-l-2 animate-in animate-out transition-all",
				hovering ? (mentioningMe ? "bg-yellow-600 bg-opacity-10" : "bg-primary-foreground") : "",
				!groupWithPrevMessage ? "p-1 px-5 gap-4" : "p-1 px-5 pl-[73px]",
				isNewMessage
					? "border-red-500 bg-primary-foreground"
					: mentioningMe
						? cn("border-yellow-500 bg-yellow-500 bg-opacity-10", !isScrolling && "hover:bg-yellow-600 hover:bg-opacity-20")
						: replyUUID === message.uuid || editUUID === message.uuid
							? "border-indigo-500 bg-primary-foreground"
							: cn("border-transparent", !isScrolling && "hover:bg-primary-foreground")
			)
		}, [hovering, mentioningMe, isNewMessage, groupWithPrevMessage, isScrolling, replyUUID, message.uuid, editUUID])

		const embed = useMemo(() => {
			return links.length > 0 && !message.embedDisabled ? (
				<div className="flex flex-col mt-1 gap-2">
					{Object.keys(displayAs).map((link, index) => {
						const dAs = displayAs[link]

						if (dAs === "youtubeEmbed") {
							return (
								<YouTube
									link={link}
									key={index}
									messageUUID={message.uuid}
									userId={userId}
									senderId={message.senderId}
								/>
							)
						}

						if (dAs === "xEmbed") {
							return (
								<X
									link={link}
									key={index}
									messageUUID={message.uuid}
									userId={userId}
									senderId={message.senderId}
								/>
							)
						}

						if (dAs === "image") {
							return (
								<Image
									link={link}
									key={index}
									messageUUID={message.uuid}
									userId={userId}
									senderId={message.senderId}
								/>
							)
						}

						if (dAs === "og") {
							return (
								<OG
									link={link}
									key={index}
									messageUUID={message.uuid}
									ogData={ogData[link] ?? {}}
									userId={userId}
									senderId={message.senderId}
								/>
							)
						}

						if (dAs === "async") {
							return (
								<Async
									link={link}
									key={index}
									messageUUID={message.uuid}
									userId={userId}
									senderId={message.senderId}
								/>
							)
						}

						if (dAs === "filenEmbed") {
							return (
								<Filen
									link={link}
									key={index}
									messageUUID={message.uuid}
									userId={userId}
									senderId={message.senderId}
								/>
							)
						}

						return null
					})}
				</div>
			) : null
		}, [displayAs, links.length, message.embedDisabled, message.senderId, ogData, message.uuid, userId])

		const replyTo = useMemo(() => {
			return message.replyTo && message.replyTo.uuid ? (
				<div className="flex flex-row gap-2 text-muted-foreground text-sm items-center">
					<Reply
						size={16}
						className="scale-x-[-1] shrink-0"
					/>
					<Avatar
						src={message.replyTo.senderAvatar}
						size={16}
						className="shrink-0"
					/>
					<p className="shrink-0">
						{message.replyTo.senderNickName.length > 0 ? message.replyTo.senderNickName : message.replyTo.senderEmail}:
					</p>
					<ReplaceMessageWithComponentsInline
						content={message.replyTo.message}
						participants={conversation.participants}
					/>
				</div>
			) : null
		}, [message.replyTo, conversation.participants])

		const tooltipContent = useMemo(() => {
			return (
				<TooltipContent
					side="top"
					align="end"
					className="mb-[-15px] p-0 flex flex-row z-[100]"
				>
					<div
						className="bg-transparent hover:bg-secondary p-[8px] cursor-pointer flex flex-row items-center justify-center"
						onClick={reply}
					>
						<Reply size={20} />
					</div>
					{message.senderId === userId && (
						<div
							className="bg-transparent hover:bg-secondary p-[8px] cursor-pointer flex flex-row items-center justify-center"
							onClick={edit}
						>
							<Edit size={20} />
						</div>
					)}
					<div
						className="bg-transparent hover:bg-secondary p-[8px] cursor-pointer flex flex-row items-center justify-center"
						onClick={triggerMoreIconContextMenu}
					>
						<MoreHorizontal size={20} />
					</div>
				</TooltipContent>
			)
		}, [edit, message.senderId, reply, triggerMoreIconContextMenu, userId])

		const top = useMemo(() => {
			return (
				<>
					{!prevMessage && (
						<div className="flex flex-row px-5 mt-4">
							<Header />
						</div>
					)}
					{((prevMessage && !groupWithPrevMessage) || !prevMessage) && (
						<div
							style={{
								height: 16
							}}
						/>
					)}
					{message.sentTimestamp > lastFocus &&
						message.senderId !== userId &&
						!(prevMessage && prevMessage.sentTimestamp > lastFocus) && <NewDivider t={t} />}
					{(!prevMessageSameDay || !prevMessage) && <DateDivider timestamp={message.sentTimestamp} />}
				</>
			)
		}, [groupWithPrevMessage, prevMessage, message.sentTimestamp, message.senderId, lastFocus, t, prevMessageSameDay, userId])

		useMountedEffect(() => {
			;(async () => {
				for (const link of links) {
					if (initialDisplayAs[link] !== "async") {
						return
					}

					try {
						const headers = await worker.corsHead(link)

						if (typeof headers["content-type"] !== "string") {
							return
						}

						const headersEx = headers["content-type"].split(";")

						if (!headersEx[0]) {
							return
						}

						const contentType = headersEx[0].trim()

						if (EMBED_CONTENT_TYPES_IMAGES.includes(contentType)) {
							setDisplayAs(prev => ({ ...prev, [link]: "image" }))

							return
						}

						if (["audio/mp3"].includes(contentType)) {
							setDisplayAs(prev => ({ ...prev, [link]: "audio" }))

							return
						}

						if (["video/mp4"].includes(contentType)) {
							setDisplayAs(prev => ({ ...prev, [link]: "video" }))

							return
						}

						if (["application/pdf"].includes(contentType)) {
							setDisplayAs(prev => ({ ...prev, [link]: "pdf" }))

							return
						}

						if (contentType === "text/html") {
							const og = await worker.parseOGFromURL(link)

							setOGData(prev => ({ ...prev, [link]: og }))
							setDisplayAs(prev => ({ ...prev, [link]: "og" }))

							return
						}
					} catch (e) {
						console.error(e)
					}

					setDisplayAs(prev => ({ ...prev, [link]: "normal" }))
				}
			})()
		})

		const profile = useCallback(() => {
			eventEmitter.emit("openProfileDialog", message.senderId)
		}, [message.senderId])

		useEffect(() => {
			if (Object.keys(displayAs).length > 0) {
				chatDisplayMessageAsCache.set(message.uuid, displayAs)
			}

			if (Object.keys(ogData).length > 0) {
				chatOGDataCache.set(message.uuid, ogData)
			}
		}, [displayAs, message.uuid, ogData])

		return (
			<>
				{top}
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div>
								<ContextMenu
									message={message}
									setHovering={setHovering}
								>
									<div
										ref={ref}
										className={className}
									>
										{!groupWithPrevMessage && (
											<div className="flex flex-col">
												<Avatar
													size={36}
													src={message.senderAvatar}
												/>
											</div>
										)}
										<div className={cn("flex flex-col w-full h-auto", !groupWithPrevMessage ? "gap-[1px]" : "")}>
											{replyTo}
											{!groupWithPrevMessage && (
												<div className="flex flex-row gap-2 items-center">
													<p
														className="cursor-pointer hover:underline"
														onClick={profile}
													>
														{message.senderNickName.length > 0 ? message.senderNickName : message.senderEmail}
													</p>
													<Time
														timestamp={message.sentTimestamp}
														t={t}
													/>
												</div>
											)}
											<div className="flex flex-row w-full h-auto text-muted-foreground">
												<ReplaceMessageWithComponents
													content={message.message}
													participants={conversation.participants}
													failed={didMessageFail}
													edited={message.edited}
													t={t}
												/>
											</div>
											{embed}
										</div>
									</div>
								</ContextMenu>
							</div>
						</TooltipTrigger>
						{tooltipContent}
					</Tooltip>
				</TooltipProvider>
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
