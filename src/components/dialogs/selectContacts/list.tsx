import { memo, useMemo, useCallback } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import Contact from "./contact"
import { Virtuoso } from "react-virtuoso"

export const List = memo(
	({
		responseContacts,
		setResponseContacts,
		exclude,
		search
	}: {
		responseContacts: ContactType[]
		setResponseContacts: React.Dispatch<React.SetStateAction<ContactType[]>>
		exclude: number[]
		search: string
	}) => {
		const query = useQuery({
			queryKey: ["listContacts"],
			queryFn: () => worker.listContacts()
		})

		const contactsSorted = useMemo(() => {
			if (!query.isSuccess) {
				return []
			}

			const term = search.toLowerCase().trim()

			if (term.length === 0) {
				return query.data.sort((a, b) => b.lastActive - a.lastActive)
			}

			return query.data
				.filter(c => c.email.toLowerCase().includes(term) || c.nickName.toLowerCase().includes(term))
				.sort((a, b) => b.lastActive - a.lastActive)
		}, [query.isSuccess, query.data, search])

		const getItemKey = useCallback((_: number, contact: ContactType) => contact.uuid, [])

		const itemContent = useCallback(
			(_: number, contact: ContactType) => {
				return (
					<Contact
						contact={contact}
						responseContacts={responseContacts}
						setResponseContacts={setResponseContacts}
						exclude={exclude}
					/>
				)
			},
			[exclude, setResponseContacts, responseContacts]
		)

		return (
			<div className="flex flex-col">
				<Virtuoso
					data={contactsSorted}
					totalCount={contactsSorted.length}
					height={384}
					width="100%"
					computeItemKey={getItemKey}
					itemContent={itemContent}
					style={{
						overflowX: "hidden",
						overflowY: "auto",
						height: 384 + "px",
						width: "100%"
					}}
				/>
			</div>
		)
	}
)

export default List
