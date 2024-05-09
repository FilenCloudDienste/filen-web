import { memo, useMemo, useRef } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useVirtualizer } from "@tanstack/react-virtual"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import useAccount from "@/hooks/useAccount"
import Avatar from "@/components/avatar"
import { simpleDate } from "@/utils"

export const Events = memo(() => {
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const { t } = useTranslation()
	const windowSize = useWindowSize()
	const account = useAccount()

	const query = useQuery({
		queryKey: ["listEvents"],
		queryFn: () => worker.listEvents()
	})

	const eventsSorted = useMemo(() => {
		if (!query.isSuccess) {
			return []
		}

		return query.data.sort((a, b) => b.timestamp - a.timestamp)
	}, [query.isSuccess, query.data])

	const rowVirtualizer = useVirtualizer({
		count: eventsSorted.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 49,
		getItemKey(index) {
			return eventsSorted[index].uuid
		},
		overscan: 5
	})

	if (!query.isSuccess || !account) {
		return null
	}

	return (
		<div className="flex flex-col p-6 pb-0 w-5/6 h-full">
			<div
				ref={virtualizerParentRef}
				style={{
					height: windowSize.height - 24 - (IS_DESKTOP ? 24 : 0),
					overflowX: "hidden",
					overflowY: "auto",
					width: "100%"
				}}
			>
				{query.isSuccess && eventsSorted.length === 0 ? (
					<div className="w-full h-full flex flex-col items-center justify-center">
						<p className="select-none">{t("settings.events.listEmpty")}</p>
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
							const event = eventsSorted[virtualItem.index]

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
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`
									}}
								>
									<div className="flex flex-row border-b items-center justify-between px-4 py-3 gap-10 cursor-pointer hover:bg-secondary hover:rounded-md">
										<div className="flex flex-row gap-3 items-center">
											<Avatar
												src={account.account.avatarURL}
												size={24}
											/>
											<p className="line-clamp-1 text-ellipsis break-all">{event.type}</p>
										</div>
										<p className="text-muted-foreground text-sm shrink-0">{simpleDate(event.timestamp)}</p>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
})

export default Events
