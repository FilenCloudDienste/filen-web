import { memo, useCallback, useMemo, useEffect } from "react"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { Plus } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import useWindowSize from "@/hooks/useWindowSize"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import Participant from "./participant"
import { selectContacts } from "@/components/dialogs/selectContacts"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useChatsStore } from "@/stores/chats.store"
import eventEmitter from "@/lib/eventEmitter"
import useSDKConfig from "@/hooks/useSDKConfig"
import { Virtuoso } from "react-virtuoso"
import { getSocket } from "@/lib/socket"
import { type SocketEvent } from "@filen/sdk"
import { Skeleton } from "@/components/ui/skeleton"

export const Participants = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { t } = useTranslation()
	const windowSize = useWindowSize()
	const { setConversations, setSelectedConversation } = useChatsStore(
		useCallback(
			state => ({
				setConversations: state.setConversations,
				setSelectedConversation: state.setSelectedConversation
			}),
			[]
		)
	)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { userId } = useSDKConfig()

	const onlineQuery = useQuery({
		queryKey: ["chatConversationOnline", conversation.uuid],
		queryFn: () => worker.chatConversationOnline({ conversation: conversation.uuid }),
		refetchInterval: 15000,
		refetchIntervalInBackground: true
	})

	const participantsSorted = useMemo(() => {
		return conversation.participants.sort((a, b) => a.email.localeCompare(b.email))
	}, [conversation.participants])

	const showSkeletons = useMemo(() => {
		if (onlineQuery.isSuccess && onlineQuery.data.length >= 0) {
			return false
		}

		return true
	}, [onlineQuery.data, onlineQuery.isSuccess])

	const hasWritePermissions = useMemo(() => {
		if (userId === conversation.ownerId) {
			return true
		}

		const found = conversation.participants.filter(p => p.userId === userId)

		if (found.length === 0 || !found[0]) {
			return false
		}

		return found[0].permissionsAdd
	}, [userId, conversation.participants, conversation.ownerId])

	const addParticipant = useCallback(async () => {
		if (!hasWritePermissions) {
			return
		}

		const selectedContacts = await selectContacts({ excludeUserIds: conversation.participants.map(p => p.userId) })

		if (selectedContacts.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			await Promise.all(
				selectedContacts.contacts.map(contact =>
					worker.chatConversationAddParticipant({ conversation: conversation.uuid, contact })
				)
			)

			eventEmitter.emit("refetchChats")

			const addedUserIds = selectedContacts.contacts.map(c => c.userId)
			const convo: ChatConversation = {
				...conversation,
				participants: [
					...conversation.participants.filter(p => !addedUserIds.includes(p.userId)),
					...selectedContacts.contacts.map(contact => ({
						userId: contact.userId,
						email: contact.email,
						avatar: contact.avatar,
						nickName: contact.nickName,
						metadata: "",
						permissionsAdd: true,
						addedTimestamp: Date.now()
					}))
				]
			}

			setConversations(prev => prev.map(c => (c.uuid === conversation.uuid ? convo : c)))
			setSelectedConversation(prev => (prev ? (prev.uuid === conversation.uuid ? convo : prev) : prev))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [conversation, loadingToast, errorToast, setSelectedConversation, setConversations, hasWritePermissions])

	const getItemKey = useCallback((_: number, participant: ChatConversationParticipant) => participant.userId, [])

	const itemContent = useCallback(
		(_: number, participant: ChatConversationParticipant) => {
			return (
				<Participant
					conversation={conversation}
					onlineUsers={onlineQuery.isSuccess ? onlineQuery.data : []}
					participant={participant}
				/>
			)
		},
		[conversation, onlineQuery.data, onlineQuery.isSuccess]
	)

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="flex flex-col w-full h-full overflow-hidden">
						{showSkeletons
							? new Array(100).fill(1).map((_, index) => {
									return (
										<div
											key={index}
											className="flex flex-row items-center p-3 py-2 gap-3 cursor-pointer hover:bg-secondary"
										>
											<Skeleton className="w-[28px] h-[28px] rounded-full" />
											<div className="flex flex-row items-center gap-3 grow">
												<Skeleton className="w-full h-[18px] rounded-md" />
											</div>
										</div>
									)
								})
							: null}
					</div>
				)
			}
		}
	}, [showSkeletons])

	const socketEventListener = useCallback(
		async (event: SocketEvent) => {
			try {
				if (event.type === "chatConversationParticipantLeft") {
					await onlineQuery.refetch()
				}
			} catch (e) {
				console.error(e)
			}
		},
		[onlineQuery]
	)

	useEffect(() => {
		const socket = getSocket()

		socket.addListener("socketEvent", socketEventListener)

		return () => {
			socket.removeListener("socketEvent", socketEventListener)
		}
	}, [socketEventListener])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: windowSize.height - 48 + "px",
			width: "100%"
		}
	}, [windowSize.height])

	return (
		<div className="w-full h-full flex flex-col">
			<div className="w-full h-12 flex flex-row items-center justify-between px-4">
				<p className="line-clamp-1 text-ellipsis break-all">Participants</p>
				{hasWritePermissions && (
					<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
						<Tooltip>
							<TooltipTrigger asChild={true}>
								<div
									className="hover:bg-secondary rounded-md p-1 cursor-pointer"
									onClick={addParticipant}
								>
									<Plus />
								</div>
							</TooltipTrigger>
							<TooltipContent side="left">
								<p>{t("chats.addParticipants")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>
			<div className="flex flex-col w-full h-auto">
				<Virtuoso
					data={participantsSorted}
					totalCount={participantsSorted.length}
					height={windowSize.height - 48}
					width="100%"
					computeItemKey={getItemKey}
					itemContent={itemContent}
					components={components}
					style={style}
				/>
			</div>
		</div>
	)
})

export default Participants
