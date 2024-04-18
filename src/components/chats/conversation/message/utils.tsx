import regexifyString from "regexify-string"
import { type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useMemo, memo } from "react"
import EMOJI_REGEX from "emojibase-regex"
import { type TFunction } from "i18next"
import { customEmojis } from "./customEmojis"
import { cn } from "@/lib/utils"

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
							<div
								key={index}
								className="flex-col max-w-full p-2 py-1 bg-secondary border rounded-lg shadow-sm basis-full"
							>
								{code}
							</div>
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
								style={{
									width: size,
									height: size
								}}
								className="flex flex-row mr-[5px] mb-[2px] mt-[1px]"
							>
								<img
									src={customEmojisListRecord[customEmoji]}
									className="flex w-full h-full"
								/>
							</div>
						)
					}

					return (
						<div
							key={index}
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								marginTop: 2,
								padding: 0,
								flexShrink: 0
							}}
						>
							{match}
						</div>
					)
				},
				input: content
			})
		}, [content, participants])

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
