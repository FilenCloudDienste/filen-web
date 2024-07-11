import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Ignore from "./ignore"
import { type LocalTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/local"
import { type RemoteTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/remote"

export type IgnoreType = {
	localPath: string
	relativePath: string
	reason: LocalTreeIgnoredReason | RemoteTreeIgnoredReason
}

export const Ignored = memo(({ sync }: { sync: SyncPair }) => {
	const { localIgnored, remoteIgnored } = useSyncsStore()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 88
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

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={ignored}
			totalCount={ignored.length}
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

export default Ignored
