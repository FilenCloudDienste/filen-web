import { memo, useMemo, useRef, useState, useCallback } from "react"
import worker from "@/lib/worker"
import { useQueries } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import useLocation from "@/hooks/useLocation"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import Contact from "./contact"
import { useTranslation } from "react-i18next"
import { ONLINE_TIMEOUT } from "../chats/participants/participant"
import Blocked from "./blocked"

export const Contacts = memo(() => {
	const windowSize = useWindowSize()
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const location = useLocation()
	const [search, setSearch] = useState<string>("")
	const { t } = useTranslation()

	const [allQuery, requestsInQuery, requestsOutQuery, blockedQuery] = useQueries({
		queries: [
			{
				queryKey: ["listContacts"],
				queryFn: () => worker.listContacts()
			},
			{
				queryKey: ["listContactsRequestsIn"],
				queryFn: () => worker.listContactsRequestsIn()
			},
			{
				queryKey: ["listContactsRequestsOut"],
				queryFn: () => worker.listContactsRequestsOut()
			},
			{
				queryKey: ["listBlockedContacts"],
				queryFn: () => worker.listBlockedContacts()
			}
		]
	})

	const refetch = useCallback(async () => {
		try {
			await Promise.all([allQuery.refetch(), requestsInQuery.refetch(), requestsOutQuery.refetch(), blockedQuery.refetch()])
		} catch (e) {
			console.error(e)
		}
	}, [allQuery, requestsInQuery, requestsOutQuery, blockedQuery])

	const contactsSorted = useMemo(() => {
		if (!allQuery.isSuccess) {
			return []
		}

		let contacts: ContactType[] = []

		if (location.includes("online")) {
			contacts = allQuery.data.filter(c => c.lastActive > Date.now() - ONLINE_TIMEOUT).sort((a, b) => b.lastActive - a.lastActive)
		} else if (location.includes("offline")) {
			contacts = allQuery.data.filter(c => c.lastActive < Date.now() - ONLINE_TIMEOUT).sort((a, b) => b.email.localeCompare(a.email))
		} else {
			contacts = allQuery.data.sort((a, b) => b.email.localeCompare(a.email))
		}

		const searchLowerCased = search.toLowerCase().trim()

		if (searchLowerCased.length === 0) {
			return contacts
		}

		return contacts.filter(c => c.email.toLowerCase().includes(searchLowerCased) || c.nickName.toLowerCase().includes(searchLowerCased))
	}, [allQuery.isSuccess, allQuery.data, location, search])

	const blockedSorted = useMemo(() => {
		if (!blockedQuery.isSuccess) {
			return []
		}

		const searchLowerCased = search.toLowerCase().trim()

		if (searchLowerCased.length === 0) {
			return blockedQuery.data
		}

		return blockedQuery.data.filter(
			c => c.email.toLowerCase().includes(searchLowerCased) || c.nickName.toLowerCase().includes(searchLowerCased)
		)
	}, [blockedQuery.isSuccess, blockedQuery.data, search])

	const rowVirtualizer = useVirtualizer({
		count: location.includes("blocked") ? blockedSorted.length : contactsSorted.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 68,
		getItemKey(index) {
			return location.includes("blocked") ? blockedSorted[index].uuid : contactsSorted[index].uuid
		},
		overscan: 5
	})

	return (
		<div className="flex flex-col w-full h-full">
			<div className="flex flex-col max-w-[75%] h-full">
				<div className="flex flex-row gap-2 p-4">
					<Input
						className="grow"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder={t("contacts.search")}
					/>
					<Button>{t("contacts.addContact")}</Button>
				</div>
				<div className="flex flex-row px-4">
					<div className="flex flex-row text-muted-foreground mt-2 pb-3 grow uppercase gap-3 line-clamp-1 text-ellipsis break-all">
						<p>
							{location.includes("all")
								? t("innerSideBar.contacts.all")
								: location.includes("online")
									? t("innerSideBar.contacts.online")
									: location.includes("offline")
										? t("innerSideBar.contacts.offline")
										: location.includes("blocked")
											? t("innerSideBar.contacts.blocked")
											: t("innerSideBar.contacts.all")}
						</p>
						<p>—</p>
						<p>{location.includes("blocked") ? blockedSorted.length : contactsSorted.length}</p>
					</div>
				</div>
				<div
					ref={virtualizerParentRef}
					className="px-4"
					style={{
						height: windowSize.height - 72 - 44 - (IS_DESKTOP ? 24 : 0),
						overflowX: "hidden",
						overflowY: "auto"
					}}
				>
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative"
						}}
					>
						{rowVirtualizer.getVirtualItems().map(virtualItem => {
							return (
								<div
									key={virtualItem.key}
									data-index={virtualItem.index}
									ref={rowVirtualizer.measureElement}
								>
									{location.includes("blocked") ? (
										<Blocked
											blocked={blockedSorted[virtualItem.index]}
											refetch={refetch}
										/>
									) : (
										<Contact
											contact={contactsSorted[virtualItem.index]}
											refetch={refetch}
										/>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
})

export default Contacts
