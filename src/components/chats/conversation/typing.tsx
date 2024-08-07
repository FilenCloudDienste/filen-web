import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { useTranslation } from "react-i18next"
import { type SocketEvent } from "@filen/sdk"
import { getSocket } from "@/lib/socket"
import { MoreHorizontal } from "lucide-react"

export type TypingUser = {
	id: number
	email: string
	nickName: string
	avatar: string | null
}[]

export const Typing = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { t } = useTranslation()
	const [typingUsers, setTypingUsers] = useState<TypingUser>([])
	const typingUsersTimeout = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

	const typing = useMemo((): React.ReactNode => {
		return (
			<>
				<MoreHorizontal className="animate-pulse" />
				<p>{`${typingUsers.map(user => (user.nickName.length > 0 ? user.nickName : user.email)).join(",")} `}</p>
				<p className="text-muted-foreground">{`${t(typingUsers.length <= 1 ? "chats.input.typing" : "chats.input.typingMultiple")}`}</p>
			</>
		)
	}, [typingUsers, t])

	const socketEventListener = useCallback(
		(event: SocketEvent) => {
			if (event.type === "chatTyping" && event.data.conversation === conversation.uuid) {
				clearTimeout(typingUsersTimeout.current[event.data.senderId])

				if (event.data.type === "down") {
					setTypingUsers(prev => [
						...prev.filter(user => user.id !== event.data.senderId),
						{
							id: event.data.senderId,
							email: event.data.senderEmail,
							nickName: event.data.senderNickName,
							avatar: event.data.senderAvatar
						}
					])

					typingUsersTimeout.current[event.data.senderId] = setTimeout(() => {
						setTypingUsers(prev => prev.filter(user => user.id !== event.data.senderId))
					}, 15000)
				} else {
					setTypingUsers(prev => prev.filter(user => user.id !== event.data.senderId))
				}
			}
		},
		[conversation.uuid]
	)

	useEffect(() => {
		const socket = getSocket()

		socket.addListener("socketEvent", socketEventListener)

		const typingUsers = typingUsersTimeout.current

		return () => {
			socket.removeListener("socketEvent", socketEventListener)

			for (const typingUser in typingUsers) {
				clearTimeout(typingUsers[typingUser])
			}
		}
	}, [socketEventListener])

	return <div className="flex flex-row items-center gap-1 text-sm h-4">{typingUsers.length === 0 ? <>&nbsp;</> : typing}</div>
})

export default Typing
