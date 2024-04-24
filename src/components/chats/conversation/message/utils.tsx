import regexifyString from "regexify-string"
import { type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useMemo, memo, useRef, useEffect, createElement, useCallback } from "react"
import EMOJI_REGEX from "emojibase-regex"
import { type TFunction } from "i18next"
import { customEmojis } from "../../customEmojis"
import { cn } from "@/lib/utils"
import { Emoji } from "emoji-mart"
import { TooltipContent, Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy } from "lucide-react"

export const MENTION_REGEX = /(@[\w.-]+@[\w.-]+\.\w+|@everyone)/g
export const customEmojisList = customEmojis.map(emoji => emoji.id)
export const customEmojisListRecord: Record<string, string> = customEmojis.reduce(
	(prev, value) => ({ ...prev, [value.id]: value.skins[0].src }),
	{}
)
export const lineBreakRegex = /\n/
export const codeRegex = /```([\s\S]*?)```/
export const linkRegex = /(https?:\/\/\S+)/
export const emojiRegexWithSkinTones = /:[\d+_a-z-]+(?:::skin-tone-\d+)?:/
export const mentions = /(@[\w.-]+@[\w.-]+\.\w+|@everyone)/
export const emojiRegex = new RegExp(`${EMOJI_REGEX.source}|${emojiRegexWithSkinTones.source}`)
export const messageContentRegex = new RegExp(
	`${EMOJI_REGEX.source}|${emojiRegexWithSkinTones.source}|${codeRegex.source}|${lineBreakRegex.source}|${linkRegex.source}|${mentions.source}`
)

// Dirty because emoji-mart's Emoji component does not support react yet
export const EmojiElement = memo(
	(props: { shortcodes?: string; native?: string; fallback?: string; size: string; style?: React.CSSProperties }) => {
		const ref = useRef<HTMLSpanElement>(null)
		const instance = useRef<Emoji | null>(null)

		if (instance.current) {
			// @ts-expect-error emoji-mart types are bad
			instance.current.update(props)
		}

		useEffect(() => {
			instance.current = new Emoji({ ...props, ref })

			return () => {
				instance.current = null
			}
		}, [props])

		return createElement("div", {
			ref,
			style: props.style
		})
	}
)

export const ReplaceMessageWithComponents = memo(
	({
		content,
		participants,
		failed,
		edited,
		t
	}: {
		content: string
		participants: ChatConversationParticipant[]
		failed: boolean
		edited: boolean
		t: TFunction<"translation", undefined>
	}) => {
		const copy = useCallback(async (text: string) => {
			try {
				await navigator.clipboard.writeText(text)
			} catch (e) {
				console.error(e)
			}
		}, [])

		const replaced = useMemo(() => {
			const emojiCount = content.match(emojiRegex)
			const defaultSize = 36
			let size: number | undefined = defaultSize

			if (emojiCount) {
				const emojiCountJoined = emojiCount.join("")

				if (emojiCountJoined.length !== content.trim().length) {
					size = 24
				}
			}

			return regexifyString({
				pattern: messageContentRegex,
				decorator: (match, index) => {
					if (match.startsWith("@") && (match.split("@").length === 3 || match.startsWith("@everyone"))) {
						const email = match.slice(1).trim()

						if (email === "everyone") {
							return (
								<div
									key={index}
									className="bg-indigo-500 rounded-sm p-[1px] px-1 shadow-sm"
								>
									<p>@everyone</p>
								</div>
							)
						}

						if (!email.includes("@")) {
							return (
								<div
									key={index}
									className="bg-indigo-500 rounded-sm p-[1px] px-1 shadow-sm"
								>
									<p>@UnknownUser</p>
								</div>
							)
						}

						const foundParticipant = participants.filter(p => p.email === email)

						if (foundParticipant.length === 0) {
							return (
								<div
									key={index}
									className="bg-indigo-500 rounded-sm p-[1px] px-1 shadow-sm"
								>
									<p>@UnknownUser</p>
								</div>
							)
						}

						return (
							<div
								key={index}
								className="bg-indigo-500 rounded-sm p-[1px] px-1 cursor-pointer shadow-sm"
							>
								<p>@{foundParticipant[0].nickName.length > 0 ? foundParticipant[0].nickName : foundParticipant[0].email}</p>
							</div>
						)
					}

					if (match.split("```").length >= 3) {
						let code = match.split("```").join("")

						if (code.startsWith("\n")) {
							code = code.slice(1, code.length)
						}

						if (code.endsWith("\n")) {
							code = code.slice(0, code.length - 1)
						}

						return (
							<TooltipProvider
								delayDuration={100}
								key={index}
							>
								<Tooltip>
									<TooltipTrigger asChild={true}>
										<div
											className="flex-col max-w-full p-2 py-1 bg-secondary border rounded-md shadow-sm basis-full cursor-pointer font-mono"
											onClick={() => copy(code)}
										>
											{code}
										</div>
									</TooltipTrigger>
									<TooltipContent
										side="top"
										align="end"
										className="cursor-pointer p-0"
									>
										<div
											className="bg-transparent hover:bg-secondary p-[10px] cursor-pointer flex flex-row items-center justify-center"
											onClick={() => copy(code)}
										>
											<Copy size={18} />
										</div>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)
					}

					if (linkRegex.test(match) && (match.startsWith("https://") || match.startsWith("http://"))) {
						return (
							<div
								key={index}
								style={{
									flexDirection: "row",
									alignItems: "center",
									flexWrap: "wrap",
									flexShrink: 0
								}}
							>
								<a
									className="cursor-pointer text-blue-500 hover:underline break-all"
									href={match}
									target="_blank"
								>
									{match}
								</a>
							</div>
						)
					}

					if (match.includes("\n")) {
						return (
							<div
								key={index}
								style={{
									height: 5,
									width: "100%",
									flexBasis: "100%"
								}}
							/>
						)
					}

					const customEmoji = match.split(":").join("").trim()

					if (customEmojisList.includes(customEmoji) && customEmojisListRecord[customEmoji]) {
						return (
							<div
								key={index}
								className="flex flex-row"
							>
								<EmojiElement
									fallback={match}
									shortcodes={match.includes(":") ? match : undefined}
									size={size ? size + "px" : "34px"}
									style={{
										lineHeight: 1.05
									}}
								/>
							</div>
						)
					}

					return (
						<div
							key={index}
							className="flex flex-row"
						>
							<EmojiElement
								fallback={match}
								shortcodes={match.includes(":") ? match : undefined}
								native={!match.includes(":") ? match : undefined}
								size={size ? size + "px" : "34px"}
								style={{
									lineHeight: 1.05
								}}
							/>
						</div>
					)
				},
				input: content
			})
		}, [content, participants, copy])

		return (
			<div className={cn("flex flex-row flex-wrap gap-1", failed && "text-red-500")}>
				{replaced.map((r, index) => {
					if (typeof r === "string") {
						if (r.length <= 0) {
							return null
						}

						return (
							<div
								key={index}
								className="flex flex-row items-center flex-wrap"
							>
								{r.trim()}
							</div>
						)
					}

					return (
						<div
							key={index}
							className="flex flex-row items-center flex-wrap"
						>
							{r}
						</div>
					)
				})}
				{edited && (
					<p className="text-muted-foreground px-[2px] text-sm items-center flex flex-row">
						({t("chats.message.edited").toLowerCase()})
					</p>
				)}
			</div>
		)
	}
)

export const ReplaceMessageWithComponentsInline = memo(
	({ content, participants }: { content: string; participants: ChatConversationParticipant[] }) => {
		const replaced = useMemo(() => {
			return regexifyString({
				pattern: messageContentRegex,
				decorator: (match, index) => {
					if (match.startsWith("@") && (match.split("@").length === 3 || match.startsWith("@everyone"))) {
						const email = match.slice(1).trim()

						if (email === "everyone") {
							return (
								<p
									key={index}
									className="line-clamp-1 text-ellipsis break-all"
								>
									@everyone
								</p>
							)
						}

						if (!email.includes("@")) {
							return (
								<p
									key={index}
									className="line-clamp-1 text-ellipsis break-all"
								>
									@UnknownUser
								</p>
							)
						}

						const foundParticipant = participants.filter(p => p.email === email)

						if (foundParticipant.length === 0) {
							return (
								<p
									key={index}
									className="line-clamp-1 text-ellipsis break-all"
								>
									@UnknownUser
								</p>
							)
						}

						return (
							<p
								key={index}
								className="line-clamp-1 text-ellipsis break-all"
							>
								@{foundParticipant[0].nickName.length > 0 ? foundParticipant[0].nickName : foundParticipant[0].email}
							</p>
						)
					}

					if (match.split("```").length >= 3) {
						const code = match.split("```").join("").split("\n").join("")

						return (
							<p
								key={index}
								className="line-clamp-1 text-ellipsis break-all"
							>
								{code}
							</p>
						)
					}

					if (linkRegex.test(match) && (match.startsWith("https://") || match.startsWith("http://"))) {
						return (
							<p
								key={index}
								className="line-clamp-1 text-ellipsis break-all"
							>
								{match}
							</p>
						)
					}

					if (match.includes("\n")) {
						return (
							<p
								key={index}
								className="line-clamp-1 text-ellipsis break-all"
							>
								&nbsp;
							</p>
						)
					}

					const customEmoji = match.split(":").join("").trim()

					if (customEmojisList.includes(customEmoji) && customEmojisListRecord[customEmoji]) {
						return (
							<div
								key={index}
								className="flex flex-row line-clamp-1 text-ellipsis break-all"
							>
								<EmojiElement
									fallback={match}
									shortcodes={match.includes(":") ? match : undefined}
									size="18px"
									style={{
										lineHeight: 1.05
									}}
								/>
							</div>
						)
					}

					return (
						<div
							key={index}
							className="flex flex-row line-clamp-1 text-ellipsis break-all"
						>
							<EmojiElement
								fallback={match}
								shortcodes={match.includes(":") ? match : undefined}
								native={!match.includes(":") ? match : undefined}
								size="18px"
								style={{
									lineHeight: 1.05
								}}
							/>
						</div>
					)
				},
				input: content
			})
		}, [content, participants])

		return (
			<div className="flex flex-row gap-1 line-clamp-1 text-ellipsis break-all">
				{replaced.map((r, index) => {
					if (typeof r === "string") {
						if (r.length <= 0) {
							return null
						}

						return (
							<div
								key={index}
								className="flex flex-row items-center line-clamp-1 text-ellipsis break-all"
							>
								{r.trim()}
							</div>
						)
					}

					return (
						<div
							key={index}
							className="flex flex-row items-center line-clamp-1 text-ellipsis break-all"
						>
							{r}
						</div>
					)
				})}
			</div>
		)
	}
)

export function isTimestampSameDay(timestamp1: number, timestamp2: number): boolean {
	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)

	return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
}

export function isTimestampSameMinute(timestamp1: number, timestamp2: number): boolean {
	const date1 = new Date(timestamp1)
	const date2 = new Date(timestamp2)
	const date1Year = date1.getFullYear()
	const date1Month = date1.getMonth()
	const date1Date = date1.getDate()
	const date1Minutes = date1.getMinutes()
	const date2Year = date2.getFullYear()
	const date2Month = date2.getMonth()
	const date2Date = date2.getDate()
	const date2Minutes = date2.getMinutes()
	const date1Hours = date1.getHours()
	const date2Hours = date2.getHours()

	return (
		date1Year === date2Year &&
		date1Month === date2Month &&
		date1Date === date2Date &&
		date1Hours === date2Hours &&
		(date1Minutes === date2Minutes ||
			date1Minutes - 1 === date2Minutes ||
			date1Minutes === date2Minutes - 1 ||
			date1Minutes + 1 === date2Minutes ||
			date1Minutes === date2Minutes + 1 ||
			date1Minutes - 2 === date2Minutes ||
			date1Minutes === date2Minutes - 2 ||
			date1Minutes + 2 === date2Minutes ||
			date1Minutes === date2Minutes + 2)
	)
}

export function formatDate(date: Date): string {
	return date.toLocaleDateString(window.navigator.language, { year: "numeric", month: "2-digit", day: "2-digit" })
}

export function formatTime(date: Date): string {
	return date.toLocaleTimeString(window.navigator.language, { hour: "2-digit", minute: "2-digit" })
}

export function formatMessageDate(timestamp: number, t: TFunction<"translation", undefined>): string {
	const now = Date.now()
	const nowDate = new Date()
	const thenDate = new Date(timestamp)
	const diff = now - timestamp
	const seconds = Math.floor(diff / 1000)
	const nowDay = nowDate.getDate()
	const thenDay = thenDate.getDate()

	if (seconds <= 0) {
		return t("chats.message.time.now")
	}

	if (seconds < 60) {
		return t(seconds <= 1 ? "chats.message.time.secondAgo" : "chats.message.time.secondsAgo", { seconds })
	}

	if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60)

		return t(minutes <= 1 ? "chats.message.time.minuteAgo" : "chats.message.time.minutesAgo", { minutes })
	}

	if (seconds < 3600 * 4) {
		const hours = Math.floor(seconds / 3600)

		return t(hours <= 1 ? "chats.message.time.hourAgo" : "chats.message.time.hoursAgo", { hours })
	}

	if (nowDay === thenDay) {
		const date = new Date(timestamp)

		return t("chats.message.time.todayAt", { date: formatTime(date) })
	}

	if (nowDay - 1 === thenDay) {
		const date = new Date(timestamp)

		return t("chats.message.time.yesterdayAt", { date: formatTime(date) })
	}

	return `${formatDate(thenDate)} ${formatTime(thenDate)}`
}
