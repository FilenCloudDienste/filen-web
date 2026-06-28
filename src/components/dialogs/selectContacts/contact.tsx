import { memo, useMemo, useCallback } from "react"
import Avatar from "@/components/avatar"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import { cn } from "@/lib/utils"

export const Contact = memo(
	({
		responseContacts,
		setResponseContacts,
		contact,
		exclude
	}: {
		responseContacts: ContactType[]
		setResponseContacts: React.Dispatch<React.SetStateAction<ContactType[]>>
		contact: ContactType
		exclude: number[]
	}) => {
		const isSelected = useMemo(() => {
			return responseContacts.some(c => c.uuid === contact.uuid)
		}, [responseContacts, contact.uuid])

		const isExcluded = useMemo(() => {
			return exclude.some(id => id === contact.userId)
		}, [exclude, contact.userId])

		const onClick = useCallback(() => {
			if (isExcluded) {
				return
			}

			setResponseContacts(
				isSelected
					? prev => prev.filter(c => c.uuid !== contact.uuid)
					: prev => [...prev.filter(c => c.uuid !== contact.uuid), contact]
			)
		}, [isExcluded, setResponseContacts, isSelected, contact])

		return (
			<div
				className={cn(
					"flex flex-row gap-2 items-center p-2 rounded-md justify-between mb-1",
					isSelected && "bg-secondary",
					isExcluded ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-secondary"
				)}
				onClick={onClick}
				aria-disabled={isExcluded}
			>
				<div className="flex flex-row gap-2 items-center min-w-0">
					<Avatar
						src={contact.avatar}
						size={32}
					/>
					<p className="truncate min-w-0">{contact.nickName.length > 0 ? contact.nickName : contact.email}</p>
				</div>
				<p className="truncate min-w-0 text-sm text-muted-foreground">{contact.email}</p>
			</div>
		)
	}
)

export default Contact
