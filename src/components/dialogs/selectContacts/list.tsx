import { memo, useMemo, useCallback } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import Contact from "./contact"
import { Virtuoso } from "react-virtuoso"
import { Loader } from "lucide-react"
import { useTranslation } from "react-i18next"

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
		const { t } = useTranslation()

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

		if (!query.isSuccess) {
			return (
				<div className="flex flex-col w-full h-[384px] items-center justify-center">
					<Loader className="animate-spin-medium" />
				</div>
			)
		}

		if (query.isSuccess && contactsSorted.length === 0) {
			return (
				<div className="flex flex-col w-full h-[384px] items-center justify-center">
					<p className="text-muted-foreground">{t("dialogs.selectContacts.empty")}</p>
				</div>
			)
		}

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
