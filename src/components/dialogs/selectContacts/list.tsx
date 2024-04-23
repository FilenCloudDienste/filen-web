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
		exclude
	}: {
		responseContacts: ContactType[]
		setResponseContacts: React.Dispatch<React.SetStateAction<ContactType[]>>
		exclude: number[]
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

			return query.data.sort((a, b) => b.lastActive - a.lastActive)
		}, [query.isSuccess, query.data])

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
					overflowY: "auto"
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
