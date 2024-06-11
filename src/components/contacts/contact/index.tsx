import { memo, useState, useCallback, useRef } from "react"
import Avatar from "../../avatar"
import { MoreVertical, MessageCircle } from "lucide-react"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import { ONLINE_TIMEOUT } from "../../chats/participants/participant"
import ContextMenu from "./contextMenu"
import { cn } from "@/lib/utils"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import worker from "@/lib/worker"
import { useNavigate } from "@tanstack/react-router"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useTranslation } from "react-i18next"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatsStore } from "@/stores/chats.store"
import eventEmitter from "@/lib/eventEmitter"
import { useLocalStorage } from "@uidotdev/usehooks"

export const Contact = memo(
	({
		contact,
		refetch,
		conversations,
		userId
	}: {
		contact: ContactType
		refetch: () => Promise<void>
		conversations: ChatConversation[]
		userId: number
	}) => {
		const [hovering, setHovering] = useState<boolean>(false)
		const navigate = useNavigate()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const { t } = useTranslation()
		const { setConversations, setSelectedConversation } = useChatsStore()
		const isCreatingChat = useRef<boolean>(false)
		const [, setLastSelectedChatsConversation] = useLocalStorage<string>("lastSelectedChatsConversation", "")

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

				e.currentTarget.dispatchEvent(contextMenuEvent)
			},
			[]
		)

		const openChat = useCallback(async () => {
			const conversationExists = conversations.filter(
				conversation =>
					conversation.participants.length === 2 &&
					conversation.participants.some(participant => participant.userId === contact.userId) &&
					conversation.lastMessageUUID &&
					conversation.lastMessageTimestamp > 0 &&
					conversation.lastMessageSender > 0
			)

			if (conversationExists.length > 0 && conversationExists[0]) {
				setLastSelectedChatsConversation(conversationExists[0].uuid)
				setSelectedConversation(conversationExists[0])

				navigate({
					to: "/chats/$uuid",
					params: {
						uuid: conversationExists[0].uuid
					}
				})

				return
			}

			if (isCreatingChat.current) {
				return
			}

			isCreatingChat.current = true

			const toast = loadingToast()

			try {
				const [uuid, account] = await Promise.all([
					worker.createChatConversation({ contacts: [contact] }),
					worker.fetchUserAccount()
				])

				eventEmitter.emit("refetchChats")

				const convo: ChatConversation = {
					uuid,
					lastMessageSender: 0,
					lastMessage: null,
					lastMessageTimestamp: 0,
					lastMessageUUID: null,
					ownerId: userId,
					name: null,
					ownerMetadata: null,
					participants: [
						{
							userId,
							email: account.email,
							avatar: typeof account.avatarURL === "string" ? account.avatarURL : null,
							nickName: account.nickName,
							metadata: "",
							permissionsAdd: true,
							addedTimestamp: Date.now()
						},
						{
							userId: contact.userId,
							email: contact.email,
							avatar: contact.avatar,
							nickName: contact.nickName,
							metadata: "",
							permissionsAdd: true,
							addedTimestamp: Date.now()
						}
					],
					createdTimestamp: Date.now()
				}

				setConversations(prev => [...prev, convo])
				setSelectedConversation(convo)
				setLastSelectedChatsConversation(convo.uuid)

				navigate({
					to: "/chats/$uuid",
					params: {
						uuid
					}
				})
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()

				isCreatingChat.current = false
			}
		}, [
			conversations,
			contact,
			errorToast,
			loadingToast,
			navigate,
			setConversations,
			setSelectedConversation,
			userId,
			setLastSelectedChatsConversation
		])

		return (
			<ContextMenu
				contact={contact}
				setHovering={setHovering}
				refetch={refetch}
			>
				<div className={cn("flex flex-row gap-3 items-center hover:bg-secondary rounded-md p-3", hovering && "bg-secondary")}>
					<Avatar
						size={44}
						src={contact.avatar}
						status={
							contact.lastActive > 0 ? (contact.lastActive > Date.now() - ONLINE_TIMEOUT ? "online" : "offline") : "offline"
						}
					/>
					<div className="flex flex-row gap-4 items-center justify-between grow">
						<div className="flex flex-col">
							<p className="line-clamp-1 text-ellipsis break-all">
								{contact.nickName.length > 0 ? contact.nickName : contact.email}
							</p>
							<p className="line-clamp-1 text-ellipsis break-all text-sm text-muted-foreground">{contact.email}</p>
						</div>
						<div className="flex flex-row gap-4">
							<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
								<Tooltip>
									<TooltipTrigger asChild={true}>
										<div
											className="hover:bg-secondary rounded-md p-1 cursor-pointer"
											onClick={openChat}
										>
											<MessageCircle className="cursor-pointer shrink-0" />
										</div>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>{t("contacts.openChat")}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
								<Tooltip>
									<TooltipTrigger asChild={true}>
										<div
											className="hover:bg-secondary rounded-md p-1 cursor-pointer"
											onClick={triggerMoreIconContextMenu}
										>
											<MoreVertical className="cursor-pointer shrink-0" />
										</div>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>{t("contacts.more")}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</div>
			</ContextMenu>
		)
	}
)

export default Contact
