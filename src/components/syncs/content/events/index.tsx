import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore, type TransferDataWithTimestamp } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Event from "./event"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { CalendarClock } from "lucide-react"
import { useTranslation } from "react-i18next"

export const Events = memo(({ sync }: { sync: SyncPair }) => {
	const { transferEvents } = useSyncsStore()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 13 - DESKTOP_TOPBAR_HEIGHT
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

	const components = useMemo(() => {
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

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={state.transferEvents}
			totalCount={state.transferEvents.length}
			height={virtuosoHeight}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			components={components}
			defaultItemHeight={51}
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
