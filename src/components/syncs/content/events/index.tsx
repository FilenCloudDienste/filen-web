import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore, type TransferDataWithTimestamp } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Event from "./event"

export const Events = memo(({ sync }: { sync: SyncPair }) => {
	const { transferEvents } = useSyncsStore()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 88
	}, [windowSize.height])

	const state = useMemo(() => {
		return {
			transferEvents: transferEvents[sync.uuid] ? transferEvents[sync.uuid]! : []
		}
	}, [sync.uuid, transferEvents])

	const getItemKey = useCallback((_: number, event: TransferDataWithTimestamp) => `${event.localPath}:${event.timestamp}`, [])

	const itemContent = useCallback((_: number, event: TransferDataWithTimestamp) => {
		return <Event event={event} />
	}, [])

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={state.transferEvents}
			totalCount={state.transferEvents.length}
			height={virtuosoHeight}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			style={{
				overflowX: "hidden",
				overflowY: "auto",
				height: virtuosoHeight + "px",
				width: "100%"
			}}
		/>
	)
})

export default Events
