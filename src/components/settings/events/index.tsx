import { memo, useMemo, useCallback, useState, useRef, useEffect } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { Virtuoso } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import { IS_DESKTOP } from "@/constants"
import useAccount from "@/hooks/useAccount"
import Event from "./event"
import { type UserEvent } from "@filen/sdk/dist/types/api/v3/user/events"
import useErrorToast from "@/hooks/useErrorToast"

export const Events = memo(() => {
	const windowSize = useWindowSize()
	const account = useAccount()
	const errorToast = useErrorToast()
	const [events, setEvents] = useState<UserEvent[]>([])
	const queryUpdatedAtRef = useRef<number>(-1)
	const fetchingMore = useRef<boolean>(false)
	const lastEventFetchCount = useRef<number>(-1)
	const hasMoreEvents = useRef<boolean>(true)

	const query = useQuery({
		queryKey: ["listEvents"],
		queryFn: () => worker.listEvents()
	})

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 24 - (IS_DESKTOP ? 24 : 0)
	}, [windowSize.height])

	const eventsSorted = useMemo(() => {
		return events.sort((a, b) => b.timestamp - a.timestamp)
	}, [events])

	const fetchMore = useCallback(async () => {
		if (eventsSorted.length === 0 || !hasMoreEvents.current) {
			return
		}

		const lastEvent = eventsSorted.at(-1)

		if (!lastEvent || fetchingMore.current || lastEventFetchCount.current === eventsSorted.length) {
			return
		}

		lastEventFetchCount.current = eventsSorted.length
		fetchingMore.current = true

		try {
			const moreEvents = await worker.listEvents({ timestamp: lastEvent.timestamp })

			setEvents(prev => [...prev, ...moreEvents])

			if (moreEvents.length === 0) {
				hasMoreEvents.current = false
			}
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})

			lastEventFetchCount.current = -1
		} finally {
			fetchingMore.current = false
		}
	}, [eventsSorted, errorToast])

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

	useEffect(() => {
		if (query.isSuccess && query.dataUpdatedAt !== queryUpdatedAtRef.current) {
			queryUpdatedAtRef.current = query.dataUpdatedAt

			setEvents(prev => {
				const previousEventUUIDs = query.data.map(m => m.uuid)

				return [...query.data, ...prev.filter(e => !previousEventUUIDs.includes(e.uuid))]
			})
		}
	}, [query.isSuccess, query.data, query.dataUpdatedAt])

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
				itemContent={itemContent}
				endReached={fetchMore}
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
