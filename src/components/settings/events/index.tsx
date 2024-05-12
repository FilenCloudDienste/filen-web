import { memo, useMemo, useCallback } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { Virtuoso } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import useAccount from "@/hooks/useAccount"
import Event from "./event"
import { type UserEvent } from "@filen/sdk/dist/types/api/v3/user/events"

export const Events = memo(() => {
	const windowSize = useWindowSize()
	const account = useAccount()

	const query = useQuery({
		queryKey: ["listEvents"],
		queryFn: () => worker.listEvents()
	})

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 24 - (IS_DESKTOP ? 24 : 0)
	}, [windowSize.height])

	const eventsSorted = useMemo(() => {
		if (!query.isSuccess) {
			return []
		}

		return query.data.sort((a, b) => b.timestamp - a.timestamp)
	}, [query.isSuccess, query.data])

	const getItemKey = useCallback((_: number, event: UserEvent) => event.uuid, [])

	const itemContent = useCallback(
		(_: number, event: UserEvent) => {
			return (
				<Event
					event={event}
					account={account!.account}
				/>
			)
		},
		[account]
	)

	if (!query.isSuccess || !account) {
		return null
	}

	return (
		<div className="flex flex-col w-full h-full p-4">
			<Virtuoso
				data={eventsSorted}
				totalCount={eventsSorted.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				defaultItemHeight={49}
				itemContent={itemContent}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: virtuosoHeight + "px",
					width: "100%"
				}}
			/>
		</div>
	)
})

export default Events
