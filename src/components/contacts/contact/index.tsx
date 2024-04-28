import { memo, useState, useCallback } from "react"
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

export const Contact = memo(
	({ contact, refetch, conversations }: { contact: ContactType; refetch: () => Promise<void>; conversations: ChatConversation[] }) => {
		const [hovering, setHovering] = useState<boolean>(false)
		const navigate = useNavigate()
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const { t } = useTranslation()

		const triggerMoreIconContextMenu = useCallback(
			(e: React.MouseEvent<SVGSVGElement, MouseEvent> | React.MouseEvent<HTMLDivElement, MouseEvent>) => {
				e.preventDefault()

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
					conversation.participants.some(participant => participant.userId === contact.userId)
			)

			if (conversationExists.length === 1) {
				navigate({
					to: "/chats/$uuid",
					params: {
						uuid: conversationExists[0].uuid
					}
				})

				return
			}

			const toast = loadingToast()

			try {
				await worker.createChatConversation({ contacts: [contact] })
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		}, [conversations, contact, errorToast, loadingToast, navigate])

		return (
			<ContextMenu
				contact={contact}
				setHovering={setHovering}
				refetch={refetch}
			>
				<div
					className={cn(
						"flex flex-row gap-3 items-center hover:bg-secondary shadow-sm rounded-md p-3",
						hovering && "bg-secondary"
					)}
				>
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
										<p>{t("innerSideBar.notes.createNote")}</p>
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
										<p>{t("innerSideBar.notes.createNote")}</p>
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
