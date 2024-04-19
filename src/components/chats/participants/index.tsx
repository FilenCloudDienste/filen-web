import { memo, useRef } from "react"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { Plus, Crown } from "lucide-react"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "react-i18next"
import { useVirtualizer } from "@tanstack/react-virtual"
import useWindowSize from "@/hooks/useWindowSize"
import Avatar from "@/components/avatar"
import ContextMenu from "./contextMenu"

export const Participants = memo(({ conversation }: { conversation: ChatConversation }) => {
	const { t } = useTranslation()
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const windowSize = useWindowSize()

	const rowVirtualizer = useVirtualizer({
		count: conversation.participants.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 56,
		getItemKey(index) {
			return conversation.participants[index].userId
		},
		overscan: 5
	})

	return (
		<div className="w-full h-full flex flex-col">
			<div className="w-full h-12 flex flex-row items-center justify-between px-4">
				<p className="line-clamp-1 text-ellipsis break-all">Participants</p>
				<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
					<Tooltip>
						<TooltipTrigger asChild={true}>
							<div
								className="hover:bg-secondary rounded-lg p-1 cursor-pointer"
								onClick={() => {}}
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
									<ContextMenu participant={participant}>
										<div className="flex flex-row items-center p-3 gap-3 cursor-pointer hover:bg-primary-foreground">
											<Avatar
												className="w-7 h-7"
												src={participant.avatar}
												fallback={participant.email}
												status="online"
											/>
											<div className="flex flex-row items-center gap-3">
												<p className="line-clamp-1 text-ellipsis break-all">{participant.email}</p>
												{participant.userId === conversation.ownerId && (
													<Crown
														size={16}
														className="text-yellow-500 shrink-0"
													/>
												)}
											</div>
										</div>
									</ContextMenu>
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
