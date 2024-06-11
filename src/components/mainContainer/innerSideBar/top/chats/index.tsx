import { memo, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { useChatsStore } from "@/stores/chats.store"
import { Input } from "@/components/ui/input"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useNavigate } from "@tanstack/react-router"
import { selectContacts } from "@/components/dialogs/selectContacts"
import useSDKConfig from "@/hooks/useSDKConfig"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import eventEmitter from "@/lib/eventEmitter"
import { useLocalStorage } from "@uidotdev/usehooks"

export const Chats = memo(() => {
	const { t } = useTranslation()
	const { search, setSearch, setConversations, setSelectedConversation } = useChatsStore()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const navigate = useNavigate()
	const { userId } = useSDKConfig()
	const [, setLastSelectedChatsConversation] = useLocalStorage<string>("lastSelectedChatsConversation", "")

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearch(e.target.value)
		},
		[setSearch]
	)

	const createChat = useCallback(async () => {
		const selectedContacts = await selectContacts()

		if (selectedContacts.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			const [uuid, account] = await Promise.all([
				worker.createChatConversation({ contacts: selectedContacts.contacts }),
				worker.fetchUserAccount()
			])

			eventEmitter.emit("refetchChats")

			const convo: ChatConversation = {
				uuid,
				lastMessageSender: 0,
				lastMessage: null,
				lastMessageTimestamp: 0,
				lastMessageUUID: null,
				ownerId: userId,
				name: null,
				ownerMetadata: null,
				participants: [
					{
						userId,
						email: account.email,
						avatar: typeof account.avatarURL === "string" ? account.avatarURL : null,
						nickName: account.nickName,
						metadata: "",
						permissionsAdd: true,
						addedTimestamp: Date.now()
					},
					...selectedContacts.contacts.map(contact => ({
						userId: contact.userId,
						email: contact.email,
						avatar: contact.avatar,
						nickName: contact.nickName,
						metadata: "",
						permissionsAdd: true,
						addedTimestamp: Date.now()
					}))
				],
				createdTimestamp: Date.now()
			}

			setConversations(prev => [...prev, convo])
			setSelectedConversation(convo)
			setLastSelectedChatsConversation(convo.uuid)

			navigate({
				to: "/chats/$uuid",
				params: {
					uuid
				}
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [errorToast, loadingToast, navigate, userId, setSelectedConversation, setConversations, setLastSelectedChatsConversation])

	useEffect(() => {
		const createChatListener = eventEmitter.on("createChat", createChat)

		return () => {
			createChatListener.remove()
		}
	}, [createChat])

	return (
		<div
			className="h-auto w-full flex flex-col"
			id="inner-sidebar-top-chats"
		>
			<div className="h-12 w-full flex flex-row items-center px-4 justify-between">
				<p>{t("innerSideBar.top.chats")}</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-md p-1 cursor-pointer"
								onClick={createChat}
							>
								<Plus />
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>{t("innerSideBar.chats.createChat")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex flex-row w-full h-auto px-4 pb-4">
				<Input
					placeholder={t("innerSideBar.chats.search")}
					value={search}
					onChange={onChange}
				/>
			</div>
		</div>
	)
})

export default Chats
