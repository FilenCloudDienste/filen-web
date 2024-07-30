import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore, type Transfer as TransferType } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Transfer from "./transfer"
import { type LocalTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/local"
import { type RemoteTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/remote"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { ArrowDownUp } from "lucide-react"
import { useTranslation } from "react-i18next"

export type IgnoreType = {
	localPath: string
	relativePath: string
	reason: LocalTreeIgnoredReason | RemoteTreeIgnoredReason
}

export const Transfers = memo(({ sync }: { sync: SyncPair }) => {
	const { transfers: syncTransfers } = useSyncsStore()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 12 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const transfers = useMemo(() => {
		return syncTransfers[sync.uuid] ? syncTransfers[sync.uuid]! : []
	}, [sync.uuid, syncTransfers])

	const getItemKey = useCallback((_: number, transfer: TransferType) => `${transfer.localPath}:${transfer.relativePath}`, [])

	const itemContent = useCallback((_: number, transfer: TransferType) => {
		return <Transfer transfer={transfer} />
	}, [])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="w-full h-full flex flex-col items-center justify-center gap-2">
						<ArrowDownUp
							size={72}
							className="text-muted-foreground"
						/>
						<p className="text-muted-foreground">{t("syncs.noTransfers")}</p>
					</div>
				)
			}
		}
	}, [t])

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={transfers}
			totalCount={transfers.length}
			height={virtuosoHeight}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			components={components}
			defaultItemHeight={78}
			style={{
				overflowX: "hidden",
				overflowY: "auto",
				height: virtuosoHeight + "px",
				width: "100%"
			}}
		/>
	)
})

export default Transfers
