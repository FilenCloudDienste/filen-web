import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Ignore from "./ignore"
import { type LocalTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/local"
import { type RemoteTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/remote"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { RefreshCwOff } from "lucide-react"
import { useTranslation } from "react-i18next"

export type IgnoreType = {
	localPath: string
	relativePath: string
	reason: LocalTreeIgnoredReason | RemoteTreeIgnoredReason
}

export const Ignored = memo(({ sync }: { sync: SyncPair }) => {
	const { localIgnored, remoteIgnored } = useSyncsStore()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 12 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const ignored = useMemo(() => {
		const state = {
			localIgnored: localIgnored[sync.uuid] ? localIgnored[sync.uuid]! : [],
			remoteIgnored: remoteIgnored[sync.uuid] ? remoteIgnored[sync.uuid]! : []
		}
		const ignored: IgnoreType[] = []

		for (const ignore of state.localIgnored) {
			ignored.push({
				localPath: ignore.localPath,
				relativePath: ignore.relativePath,
				reason: ignore.reason
			})
		}

		for (const ignore of state.remoteIgnored) {
			ignored.push({
				localPath: ignore.localPath,
				relativePath: ignore.relativePath,
				reason: ignore.reason
			})
		}

		return ignored
	}, [sync.uuid, localIgnored, remoteIgnored])

	const getItemKey = useCallback((_: number, ignore: IgnoreType) => `${ignore.localPath}:${ignore.relativePath}:${ignore.reason}`, [])

	const itemContent = useCallback((_: number, ignore: IgnoreType) => {
		return <Ignore ignore={ignore} />
	}, [])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="w-full h-full flex flex-col items-center justify-center gap-2">
						<RefreshCwOff
							size={72}
							className="text-muted-foreground"
						/>
						<p className="text-muted-foreground">{t("syncs.nothingIgnored")}</p>
					</div>
				)
			}
		}
	}, [t])

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={ignored}
			totalCount={ignored.length}
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

export default Ignored
