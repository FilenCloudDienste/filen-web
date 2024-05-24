import { memo, useState, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import useSDKConfig from "@/hooks/useSDKConfig"

export const bgColors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-yellow-500", "bg-cyan-500", "bg-orange-500", "bg-gray-500"]

/**
 * Simple hash function for color strings (DJB2 algorithm).
 *
 * @export
 * @param {string} str
 * @returns {number}
 */
export function hashString(str: string): number {
	let hash = 5381

	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i)
	}

	return hash >>> 0
}

/**
 * Hash a string and map it to a Tailwind background color class.
 *
 * @export
 * @param {string} str
 * @returns {string}
 */
export function getColorFromHash(str: string): string {
	const hash = hashString(str)
	const index = hash % bgColors.length
	const color = bgColors[index]

	if (!color) {
		return bgColors[0]!
	}

	return color
}

export const ChatAvatar = memo(
	({
		participants,
		className,
		status,
		size
	}: {
		participants: ChatConversationParticipant[]
		className?: string
		status?: "online" | "away" | "busy" | "offline"
		size: number
	}) => {
		const [useFallback, setUseFallback] = useState<boolean>(false)
		const { userId } = useSDKConfig()

		const bgColor = useMemo(() => {
			return getColorFromHash(
				participants
					.sort((a, b) => a.email.localeCompare(b.email))
					.map(p => p.email)
					.join(":")
			)
		}, [participants])

		const src = useMemo(() => {
			if (participants.length < 2) {
				const me = participants.filter(p => p.userId === userId)

				if (me.length === 1 && me[0]) {
					return me[0].avatar
				}

				return null
			}

			const other = participants.filter(p => p.userId !== userId)

			if (other.length !== 1 || !other[0]) {
				return null
			}

			return other[0].avatar
		}, [participants, userId])

		const statusComponent = useMemo(() => {
			return (
				<div
					className={cn(
						"absolute z-50 w-3 h-3 rounded-full",
						status === "online" && "bg-green-500",
						status === "offline" && "bg-gray-500",
						status === "busy" && "bg-red-500",
						status === "away" && "bg-yellow-500"
					)}
					style={{
						marginTop: size / 1.4,
						marginLeft: size / 1.4
					}}
				/>
			)
		}, [status, size])

		const onError = useCallback(() => {
			setUseFallback(true)
		}, [])

		if (participants.length <= 2) {
			return (
				<div
					className={cn("flex flex-row shrink-0", className)}
					style={{
						width: size ? size : 32,
						height: size ? size : 32
					}}
				>
					<img
						src={!src ? "/img/fallbackAvatar.webp" : useFallback ? "/img/fallbackAvatar.webp" : src}
						className="w-full h-full object-contain rounded-full"
						onError={onError}
					/>
					{status && statusComponent}
				</div>
			)
		}

		return (
			<div
				className={cn("flex flex-row shrink-0", className)}
				style={{
					width: size ? size : 32,
					height: size ? size : 32
				}}
			>
				<div className={cn("w-full h-full object-contain rounded-full flex flex-row items-center justify-center", bgColor)}>
					<p
						style={{
							fontSize: size / 1.75
						}}
					>
						{participants.length}
					</p>
				</div>
				{status && statusComponent}
			</div>
		)
	}
)

export default ChatAvatar
