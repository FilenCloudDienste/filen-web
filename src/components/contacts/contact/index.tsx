import { memo, useState, useCallback } from "react"
import Avatar from "../../avatar"
import { MoreVertical } from "lucide-react"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import { ONLINE_TIMEOUT } from "../../chats/participants/participant"
import ContextMenu from "./contextMenu"
import { cn } from "@/lib/utils"

export const Contact = memo(({ contact, refetch }: { contact: ContactType; refetch: () => Promise<void> }) => {
	const [hovering, setHovering] = useState<boolean>(false)

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

	return (
		<ContextMenu
			contact={contact}
			setHovering={setHovering}
			refetch={refetch}
		>
			<div className={cn("flex flex-row gap-3 items-center hover:bg-secondary shadow-sm rounded-md p-3", hovering && "bg-secondary")}>
				<Avatar
					size={44}
					src={contact.avatar}
					status={contact.lastActive > 0 ? (contact.lastActive > Date.now() - ONLINE_TIMEOUT ? "online" : "offline") : "offline"}
				/>
				<div className="flex flex-row gap-4 items-center justify-between grow">
					<div className="flex flex-col">
						<p className="line-clamp-1 text-ellipsis break-all">
							{contact.nickName.length > 0 ? contact.nickName : contact.email}
						</p>
						<p className="line-clamp-1 text-ellipsis break-all text-sm text-muted-foreground">{contact.email}</p>
					</div>
					<MoreVertical
						className="cursor-pointer shrink-0"
						onClick={triggerMoreIconContextMenu}
					/>
				</div>
			</div>
		</ContextMenu>
	)
})

export default Contact
