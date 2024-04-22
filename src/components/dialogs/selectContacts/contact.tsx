import { memo, useMemo } from "react"
import Avatar from "@/components/avatar"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import { cn } from "@/lib/utils"

export const Contact = memo(
	({
		responseContacts,
		setResponseContacts,
		contact
	}: {
		responseContacts: ContactType[]
		setResponseContacts: React.Dispatch<React.SetStateAction<ContactType[]>>
		contact: ContactType
	}) => {
		const isSelected = useMemo(() => {
			return responseContacts.some(c => c.uuid === contact.uuid)
		}, [responseContacts, contact.uuid])

		return (
			<div
				className={cn(
					"flex flex-row gap-2 items-center hover:bg-secondary p-2 rounded-md cursor-pointer justify-between",
					isSelected && "bg-secondary"
				)}
				onClick={() =>
					isSelected
						? setResponseContacts(prev => prev.filter(c => c.uuid !== contact.uuid))
						: setResponseContacts(prev => [...prev.filter(c => c.uuid !== contact.uuid), contact])
				}
			>
				<div className="flex flex-row gap-2 items-center">
					<Avatar src={contact.avatar} />
					<p className="line-clamp-1 text-ellipsis break-all">{contact.nickName.length > 0 ? contact.nickName : contact.email}</p>
				</div>
				<p className="line-clamp-1 text-ellipsis break-all text-sm text-muted-foreground">{contact.email}</p>
			</div>
		)
	}
)

export default Contact
