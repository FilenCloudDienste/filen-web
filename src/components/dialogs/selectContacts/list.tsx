import { memo, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import Contact from "./contact"

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
		const virtualizerParentRef = useRef<HTMLDivElement>(null)

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

		const rowVirtualizer = useVirtualizer({
			count: contactsSorted.length,
			getScrollElement: () => virtualizerParentRef.current,
			estimateSize: () => 48,
			getItemKey(index) {
				return contactsSorted[index].uuid
			},
			overscan: 5
		})

		return (
			<div
				ref={virtualizerParentRef}
				style={{
					height: 384,
					overflowX: "hidden",
					overflowY: "auto",
					marginTop: 12
				}}
			>
				{query.isSuccess && contactsSorted.length === 0 ? (
					<div className="w-full h-full flex flex-col items-center justify-center">
						<p className="select-none">{t("dialogs.selectContacts.listEmpty")}</p>
					</div>
				) : (
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative"
						}}
					>
						{rowVirtualizer.getVirtualItems().map(virtualItem => {
							const contact = contactsSorted[virtualItem.index]

							return (
								<div
									key={virtualItem.key}
									data-index={virtualItem.index}
									ref={rowVirtualizer.measureElement}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: "auto",
										transform: `translateY(${virtualItem.start}px)`
									}}
								>
									<Contact
										contact={contact}
										responseContacts={responseContacts}
										setResponseContacts={setResponseContacts}
										exclude={exclude}
									/>
								</div>
							)
						})}
					</div>
				)}
			</div>
		)
	}
)

export default List
