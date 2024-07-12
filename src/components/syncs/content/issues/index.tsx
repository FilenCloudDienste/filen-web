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

export type IgnoreType = {
	localPath: string
	relativePath: string
	reason: LocalTreeIgnoredReason | RemoteTreeIgnoredReason
}

export const Issues = memo(({ sync }: { sync: SyncPair }) => {
	const { errors: syncErrors } = useSyncsStore()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const windowSize = useWindowSize()
	const { t } = useTranslation()

	const virtuosoHeight = useMemo(() => {
		return windowSize.height - 64 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const errors = useMemo(() => {
		return syncErrors[sync.uuid] ? syncErrors[sync.uuid]! : []
	}, [sync.uuid, syncErrors])

	const getItemKey = useCallback((index: number) => index, [])

	const itemContent = useCallback((_: number, error: GeneralError) => {
		return <Issue error={error} />
	}, [])

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

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={errors}
			totalCount={errors.length}
			height={virtuosoHeight}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			components={components}
			style={{
				overflowX: "hidden",
				overflowY: "auto",
				height: virtuosoHeight + "px",
				width: "100%"
			}}
		/>
	)
})

export default Issues
