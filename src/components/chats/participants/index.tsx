import { memo, useRef, useCallback } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { Plus } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { useVirtualizer } from "@tanstack/react-virtual"
import useWindowSize from "@/hooks/useWindowSize"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import Participant from "./participant"
import { selectContacts } from "@/components/dialogs/selectContacts"

export const Participants = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { t } = useTranslation()
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()

	const onlineQuery = useQuery({
		queryKey: ["chatConversationOnline", conversation.uuid],
		queryFn: () => worker.chatConversationOnline({ conversation: conversation.uuid }),
		refetchInterval: 15000,
		refetchIntervalInBackground: true
	})

	const rowVirtualizer = useVirtualizer({
		count: conversation.participants.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 56,
		getItemKey(index) {
			return conversation.participants[index].userId
		},
		overscan: 5
	})

	const addParticipant = useCallback(async () => {
		const selectedContacts = await selectContacts({ excludeUserIds: conversation.participants.map(p => p.userId) })

		if (selectedContacts.cancelled) {
			return
		}

		console.log(selectedContacts)
	}, [conversation.participants])

	if (!onlineQuery.isSuccess) {
		return null
	}

	return (
		<div className="w-full h-full flex flex-col">
			<div className="w-full h-12 flex flex-row items-center justify-between px-4">
				<p className="line-clamp-1 text-ellipsis break-all">Participants</p>
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
							<p>{t("innerSideBar.notes.createNote")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div className="flex flex-col w-full h-auto">
				<div
					ref={virtualizerParentRef}
					style={{
						height: windowSize.height - 48,
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
							const participant = conversation.participants[virtualItem.index]

							return (
								<div
									key={virtualItem.key}
									data-index={virtualItem.index}
									ref={rowVirtualizer.measureElement}
								>
									<Participant
										conversation={conversation}
										onlineUsers={onlineQuery.data}
										participant={participant}
									/>
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
})

export default Participants
