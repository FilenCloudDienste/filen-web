import { memo, useMemo, useState, useCallback } from "react"
import worker from "@/lib/worker"
import { useQueries } from "@tanstack/react-query"
import { Virtuoso } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import Input from "../input"
import { Button } from "@/components/ui/button"
import useLocation from "@/hooks/useLocation"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import Contact from "./contact"
import { useTranslation } from "react-i18next"
import { ONLINE_TIMEOUT } from "../chats/participants/participant"
import Blocked from "./blocked"
import Request from "./request"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { showInputDialog } from "../dialogs/input"
import { useNavigate } from "@tanstack/react-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import { type BlockedContact } from "@filen/sdk/dist/types/api/v3/contacts/blocked"
import { type ContactRequest } from "@filen/sdk/dist/types/api/v3/contacts/requests/in"
import { Skeleton } from "../ui/skeleton"
import { Plus, SearchIcon } from "lucide-react"
import useContactsContainerSize from "@/hooks/useContactsContainerSize"
import { sortAndFilterConversations } from "../mainContainer/innerSideBar/chats/utils"
import useIsMobile from "@/hooks/useIsMobile"

const refetchQueryParams = {
	refetchInterval: 5000,
	refetchIntervalInBackground: true
}

export const Contacts = memo(() => {
	const windowSize = useWindowSize()
	const location = useLocation()
	const [search, setSearch] = useState<string>("")
	const { t } = useTranslation()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const navigate = useNavigate()
	const { userId } = useSDKConfig()
	const contactsContainerSize = useContactsContainerSize()
	const isMobile = useIsMobile()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 72 - 44 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const [allQuery, requestsInQuery, requestsOutQuery, blockedQuery, chatsQuery] = useQueries({
		queries: [
			{
				queryKey: ["listContacts"],
				queryFn: () => worker.listContacts(),
				...refetchQueryParams
			},
			{
				queryKey: ["listContactsRequestsIn"],
				queryFn: () => worker.listContactsRequestsIn(),
				...refetchQueryParams
			},
			{
				queryKey: ["listContactsRequestsOut"],
				queryFn: () => worker.listContactsRequestsOut(),
				...refetchQueryParams
			},
			{
				queryKey: ["listBlockedContacts"],
				queryFn: () => worker.listBlockedContacts(),
				...refetchQueryParams
			},
			{
				queryKey: ["listChatsConversations"],
				queryFn: () => worker.listChatsConversations()
			}
		]
	})

	const chatConversations = useMemo(() => {
		if (!chatsQuery.isSuccess) {
			return []
		}

		return sortAndFilterConversations(chatsQuery.data, "", userId)
	}, [chatsQuery.isSuccess, chatsQuery.data, userId])

	const showSkeletons = useMemo(() => {
		if (location.includes("contacts/all") || location.includes("contacts/online") || location.includes("contacts/offline")) {
			if (allQuery.isSuccess && allQuery.data.length >= 0) {
				return false
			}
		}

		if (location.includes("contacts/in")) {
			if (requestsInQuery.isSuccess && requestsInQuery.data.length >= 0) {
				return false
			}
		}

		if (location.includes("contacts/out")) {
			if (requestsOutQuery.isSuccess && requestsOutQuery.data.length >= 0) {
				return false
			}
		}

		if (location.includes("contacts/blocked")) {
			if (blockedQuery.isSuccess && blockedQuery.data.length >= 0) {
				return false
			}
		}

		return true
	}, [
		location,
		allQuery.isSuccess,
		allQuery.data,
		requestsInQuery.isSuccess,
		requestsInQuery.data,
		requestsOutQuery.isSuccess,
		requestsOutQuery.data,
		blockedQuery.isSuccess,
		blockedQuery.data
	])

	const refetch = useCallback(async () => {
		try {
			await Promise.all([
				allQuery.refetch(),
				requestsInQuery.refetch(),
				requestsOutQuery.refetch(),
				blockedQuery.refetch(),
				chatsQuery.refetch()
			])
		} catch (e) {
			console.error(e)
		}
	}, [allQuery, requestsInQuery, requestsOutQuery, blockedQuery, chatsQuery])

	const sendRequest = useCallback(async () => {
		const inputResponse = await showInputDialog({
			title: t("contacts.dialogs.sendRequest.title"),
			continueButtonText: t("contacts.dialogs.sendRequest.continue"),
			value: "",
			autoFocusInput: true,
			placeholder: t("contacts.dialogs.sendRequest.placeholder")
		})

		if (inputResponse.cancelled || inputResponse.value.trim().length === 0) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.contactsRequestSend({ email: inputResponse.value.trim() })
			await refetch()

			navigate({
				to: "/contacts/$type",
				params: {
					type: "out"
				}
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [refetch, errorToast, loadingToast, navigate, t])

	const contactsSorted = useMemo(() => {
		if (!allQuery.isSuccess) {
			return []
		}

		let contacts: ContactType[] = []

		if (location.includes("contacts/online")) {
			contacts = allQuery.data.filter(c => c.lastActive > Date.now() - ONLINE_TIMEOUT).sort((a, b) => b.lastActive - a.lastActive)
		} else if (location.includes("contacts/offline")) {
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
			return blockedQuery.data.sort((a, b) => b.email.localeCompare(a.email))
		}

		return blockedQuery.data
			.filter(c => c.email.toLowerCase().includes(searchLowerCased) || c.nickName.toLowerCase().includes(searchLowerCased))
			.sort((a, b) => b.email.localeCompare(a.email))
	}, [blockedQuery.isSuccess, blockedQuery.data, search])

	const requestsInSorted = useMemo(() => {
		if (!requestsInQuery.isSuccess) {
			return []
		}

		const searchLowerCased = search.toLowerCase().trim()

		if (searchLowerCased.length === 0) {
			return requestsInQuery.data.sort((a, b) => b.email.localeCompare(a.email))
		}

		return requestsInQuery.data
			.filter(c => c.email.toLowerCase().includes(searchLowerCased) || c.nickName.toLowerCase().includes(searchLowerCased))
			.sort((a, b) => b.email.localeCompare(a.email))
	}, [requestsInQuery.isSuccess, requestsInQuery.data, search])

	const requestsOutSorted = useMemo(() => {
		if (!requestsOutQuery.isSuccess) {
			return []
		}

		const searchLowerCased = search.toLowerCase().trim()

		if (searchLowerCased.length === 0) {
			return requestsOutQuery.data.sort((a, b) => b.email.localeCompare(a.email))
		}

		return requestsOutQuery.data
			.filter(c => c.email.toLowerCase().includes(searchLowerCased) || c.nickName.toLowerCase().includes(searchLowerCased))
			.sort((a, b) => b.email.localeCompare(a.email))
	}, [requestsOutQuery.isSuccess, requestsOutQuery.data, search])

	const getItemKeyRequestsIn = useCallback((_: number, request: ContactRequest) => request.uuid, [])
	const getItemKeyRequestsOut = useCallback((_: number, request: ContactRequest) => request.uuid, [])
	const getItemKeyBlocked = useCallback((_: number, blocked: BlockedContact) => blocked.uuid, [])
	const getItemKeyContacts = useCallback((_: number, contact: ContactType) => contact.uuid, [])

	const itemContentRequestsIn = useCallback(
		(_: number, request: ContactRequest) => {
			return (
				<Request
					request={request}
					refetch={refetch}
					type="in"
				/>
			)
		},
		[refetch]
	)

	const itemContentRequestsOut = useCallback(
		(_: number, request: ContactRequest) => {
			return (
				<Request
					request={request}
					refetch={refetch}
					type="out"
				/>
			)
		},
		[refetch]
	)

	const itemContentBlocked = useCallback(
		(_: number, blocked: BlockedContact) => {
			return (
				<Blocked
					blocked={blocked}
					refetch={refetch}
				/>
			)
		},
		[refetch]
	)

	const itemContentContacts = useCallback(
		(_: number, contact: ContactType) => {
			return (
				<Contact
					contact={contact}
					refetch={refetch}
					conversations={chatConversations}
					userId={userId}
				/>
			)
		},
		[refetch, userId, chatConversations]
	)

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="flex flex-col w-full h-full overflow-hidden">
						{showSkeletons ? (
							new Array(100).fill(1).map((_, index) => {
								return (
									<div
										key={index}
										className="flex flex-row w-full h-auto mb-2"
									>
										<Skeleton className="w-full h-[68px] rounded-md" />
									</div>
								)
							})
						) : search.length > 0 ? (
							<div className="flex flex-col items-center justify-center w-full h-full gap-2 -mt-6">
								<SearchIcon size={32} />
								<p className="text-muted-foreground line-clamp-2 text-ellipsis break-all max-w-96 text-center">
									{t("contacts.emptySearch", { search })}
								</p>
							</div>
						) : null}
					</div>
				)
			}
		}
	}, [showSkeletons, search, t])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	return (
		<div className="flex flex-col w-full h-full select-none">
			<div
				className="flex flex-col h-full"
				style={{
					width: contactsContainerSize.width
				}}
			>
				<div className="flex flex-row gap-2 p-4 items-center w-full">
					<Input
						className="grow"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder={t("contacts.search")}
						withSearchIcon={true}
						withClearIcon={true}
						onClear={() => setSearch("")}
						autoCapitalize="none"
						autoComplete="none"
						autoCorrect="none"
					/>
					<Button
						onClick={sendRequest}
						size="sm"
						className="items-center gap-2"
					>
						<Plus size={16} />
						{!isMobile && t("contacts.addContact")}
					</Button>
				</div>
				<div className="flex flex-row px-4">
					<div className="flex flex-row text-muted-foreground mt-2 pb-3 grow uppercase gap-3 line-clamp-1 text-ellipsis break-all">
						<p>
							{location.includes("contacts/all")
								? t("innerSideBar.contacts.all")
								: location.includes("contacts/online")
									? t("innerSideBar.contacts.online")
									: location.includes("contacts/offline")
										? t("innerSideBar.contacts.offline")
										: location.includes("contacts/blocked")
											? t("innerSideBar.contacts.blocked")
											: location.includes("contacts/in")
												? t("innerSideBar.contacts.in")
												: location.includes("contacts/out")
													? t("innerSideBar.contacts.out")
													: t("innerSideBar.contacts.all")}
						</p>
						<p>—</p>
						<p>
							{location.includes("contacts/in")
								? requestsInSorted.length
								: location.includes("contacts/out")
									? requestsOutSorted.length
									: location.includes("contacts/blocked")
										? blockedSorted.length
										: contactsSorted.length}
						</p>
					</div>
				</div>
				<div className="flex flex-col w-full h-full px-4">
					{location.includes("contacts/in") ? (
						<Virtuoso
							data={requestsInSorted}
							totalCount={requestsInSorted.length}
							height={virtuosoHeight}
							width="100%"
							computeItemKey={getItemKeyRequestsIn}
							itemContent={itemContentRequestsIn}
							components={components}
							style={style}
						/>
					) : location.includes("contacts/out") ? (
						<Virtuoso
							data={requestsOutSorted}
							totalCount={requestsOutSorted.length}
							height={virtuosoHeight}
							width="100%"
							computeItemKey={getItemKeyRequestsOut}
							itemContent={itemContentRequestsOut}
							components={components}
							style={style}
						/>
					) : location.includes("contacts/blocked") ? (
						<Virtuoso
							data={blockedSorted}
							totalCount={blockedSorted.length}
							height={virtuosoHeight}
							width="100%"
							computeItemKey={getItemKeyBlocked}
							itemContent={itemContentBlocked}
							components={components}
							style={style}
						/>
					) : (
						<Virtuoso
							data={contactsSorted}
							totalCount={contactsSorted.length}
							height={virtuosoHeight}
							width="100%"
							computeItemKey={getItemKeyContacts}
							itemContent={itemContentContacts}
							components={components}
							style={style}
						/>
					)}
				</div>
			</div>
		</div>
	)
})

export default Contacts
