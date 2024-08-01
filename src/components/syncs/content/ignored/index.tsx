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
import SyncInfo from "../syncInfo"

export type IgnoreType = {
	localPath: string
	relativePath: string
	reason: LocalTreeIgnoredReason | RemoteTreeIgnoredReason
	type: "remote" | "local"
}

export const Ignored = memo(({ sync }: { sync: SyncPair }) => {
	const ignored = useSyncsStore(
		useCallback(
			state => {
				const filtered = {
					localIgnored: state.localIgnored[sync.uuid] ? state.localIgnored[sync.uuid]! : [],
					remoteIgnored: state.remoteIgnored[sync.uuid] ? state.remoteIgnored[sync.uuid]! : []
				}
				const ignored: IgnoreType[] = []

				for (const ignore of filtered.localIgnored) {
					ignored.push({
						localPath: ignore.localPath,
						relativePath: ignore.relativePath,
						reason: ignore.reason,
						type: "local"
					})
				}

				for (const ignore of filtered.remoteIgnored) {
					ignored.push({
						localPath: ignore.localPath,
						relativePath: ignore.relativePath,
						reason: ignore.reason,
						type: "remote"
					})
				}

				return ignored
			},
			[sync.uuid]
		)
	)
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 13 - 40 - 16 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const getItemKey = useCallback((_: number, ignore: IgnoreType) => `${ignore.localPath}:${ignore.reason}`, [])

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

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: virtuosoHeight + "px",
			width: "100%"
		}
	}, [virtuosoHeight])

	return (
		<div className="flex flex-col">
			<Virtuoso
				ref={virtuosoRef}
				data={ignored}
				totalCount={ignored.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				itemContent={itemContent}
				components={components}
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

export default Ignored
