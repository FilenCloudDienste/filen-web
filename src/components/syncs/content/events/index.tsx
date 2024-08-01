import { memo, useMemo, useRef, useCallback, useEffect } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore, type TransferDataWithTimestamp } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Event from "./event"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { CalendarClock } from "lucide-react"
import { useTranslation } from "react-i18next"
import SyncInfo from "../syncInfo"
import { useDebouncedCallback } from "use-debounce"
import { setItem, getItem } from "@/lib/localForage"
import useMountedEffect from "@/hooks/useMountedEffect"

export const Events = memo(({ sync }: { sync: SyncPair }) => {
	const { events, setTransferEvents } = useSyncsStore(
		useCallback(
			state => ({
				events: state.transferEvents[sync.uuid] ? state.transferEvents[sync.uuid]! : [],
				setTransferEvents: state.setTransferEvents
			}),
			[sync.uuid]
		)
	)
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 13 - 40 - 16 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const getItemKey = useCallback((_: number, event: TransferDataWithTimestamp) => `${event.localPath}:${event.timestamp}`, [])

	const itemContent = useCallback((_: number, event: TransferDataWithTimestamp) => {
		return <Event event={event} />
	}, [])

	const virtuosoComponents = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="w-full h-full flex flex-col items-center justify-center gap-2">
						<CalendarClock
							size={72}
							className="text-muted-foreground"
						/>
						<p className="text-muted-foreground">{t("syncs.noEventsYet")}</p>
					</div>
				)
			}
		}
	}, [t])

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	const saveEventsLocally = useDebouncedCallback(async (events: TransferDataWithTimestamp[]) => {
		try {
			await setItem("syncTransferEvents:" + sync.uuid, events)
		} catch (e) {
			console.error(e)
		}
	}, 5000)

	const fetchLocallySavedEvents = useCallback(async () => {
		if (events.length > 0) {
			return
		}

		try {
			const syncTransferEvents = await getItem<TransferDataWithTimestamp[]>("syncTransferEvents:" + sync.uuid)

			if (!syncTransferEvents) {
				return
			}

			setTransferEvents(prev => ({
				...prev,
				[sync.uuid]: syncTransferEvents
			}))
		} catch (e) {
			console.error(e)
		}
	}, [setTransferEvents, sync.uuid, events.length])

	useEffect(() => {
		saveEventsLocally(events)
	}, [events, saveEventsLocally])

	useMountedEffect(() => {
		fetchLocallySavedEvents()
	})

	return (
		<div className="flex flex-col">
			<Virtuoso
				ref={virtuosoRef}
				data={events}
				totalCount={events.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				itemContent={itemContent}
				components={virtuosoComponents}
				defaultItemHeight={65}
				overscan={0}
				style={style}
			/>
			<SyncInfo
				syncUUID={sync.uuid}
				paused={sync.paused}
			/>
		</div>
	)
})

export default Events
