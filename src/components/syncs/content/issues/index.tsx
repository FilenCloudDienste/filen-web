import { memo, useMemo, useRef, useCallback } from "react"
import { type SyncPair } from "@filen/sync/dist/types"
import { useSyncsStore, type GeneralError } from "@/stores/syncs.store"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import Issue from "./issue"
import { type LocalTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/local"
import { type RemoteTreeIgnoredReason } from "@filen/sync/dist/lib/filesystems/remote"
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { Smile } from "lucide-react"
import { useTranslation } from "react-i18next"
import SyncInfo from "../syncInfo"

export type IgnoreType = {
	localPath: string
	relativePath: string
	reason: LocalTreeIgnoredReason | RemoteTreeIgnoredReason
}

export const Issues = memo(({ sync }: { sync: SyncPair }) => {
	const errors = useSyncsStore(useCallback(state => state.errors[sync.uuid] ?? [], [sync.uuid]))
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - 13 - 40 - 16 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const getItemKey = useCallback((index: number) => index, [])

	const itemContent = useCallback(
		(_: number, error: GeneralError) => {
			return (
				<Issue
					error={error}
					syncUUID={sync.uuid}
				/>
			)
		},
		[sync.uuid]
	)

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="w-full h-full flex flex-col items-center justify-center gap-2">
						<Smile
							size={72}
							className="text-muted-foreground"
						/>
						<p className="text-muted-foreground">{t("syncs.noIssues")}</p>
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
				data={errors}
				totalCount={errors.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				itemContent={itemContent}
				components={components}
				defaultItemHeight={109}
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

export default Issues
