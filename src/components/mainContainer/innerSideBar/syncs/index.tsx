import { memo, useRef, useCallback, useMemo, useEffect } from "react"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import useWindowSize from "@/hooks/useWindowSize"
import { useTranslation } from "react-i18next"
import Sync from "./sync"
import { useLocalStorage } from "@uidotdev/usehooks"
import useRouteParent from "@/hooks/useRouteParent"
import { validate as validateUUID } from "uuid"
import { useNavigate } from "@tanstack/react-router"
import eventEmitter from "@/lib/eventEmitter"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useSyncsStore } from "@/stores/syncs.store"
import { type SyncPair } from "@filen/sync/dist/types"

export const Syncs = memo(() => {
	const [desktopConfig] = useDesktopConfig()
	const windowSize = useWindowSize()
	const { t } = useTranslation()
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const [, setLastSelectedSync] = useLocalStorage("lastSelectedSync", "")
	const routeParent = useRouteParent()
	const { selectedSync, setSelectedSync } = useSyncsStore()
	const lastAutoScrollSyncUUIDRef = useRef<string>("")
	const navigate = useNavigate()

	const syncsSorted = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs
	}, [desktopConfig.syncConfig.syncPairs])

	const create = useCallback(() => {
		eventEmitter.emit("openCreateSyncDialog")
	}, [])

	const getItemKey = useCallback((_: number, sync: SyncPair) => sync.uuid, [])

	const itemContent = useCallback((_: number, sync: SyncPair) => {
		return <Sync sync={sync} />
	}, [])

	const components = useMemo(() => {
		return {
			EmptyPlaceholder: () => {
				return (
					<div className="flex flex-col items-center justify-center p-4 w-full h-full">
						<p className="text-muted-foreground">{t("innerSideBar.syncs.empty")}</p>
						<p
							className="text-blue-500 hover:underline cursor-pointer text-sm"
							onClick={create}
						>
							{t("innerSideBar.syncs.emptyCreate")}
						</p>
					</div>
				)
			}
		}
	}, [t, create])

	useEffect(() => {
		if (
			validateUUID(routeParent) &&
			selectedSync &&
			syncsSorted.length > 0 &&
			selectedSync.uuid === routeParent &&
			virtuosoRef.current &&
			lastAutoScrollSyncUUIDRef.current !== selectedSync.uuid
		) {
			lastAutoScrollSyncUUIDRef.current = selectedSync.uuid

			const index = syncsSorted.findIndex(sync => sync.uuid === selectedSync.uuid)

			if (index === -1) {
				return
			}

			virtuosoRef.current.scrollToIndex({
				index,
				align: "center",
				behavior: "auto"
			})
		}
	}, [syncsSorted, routeParent, selectedSync])

	useEffect(() => {
		if (syncsSorted.length > 0 && syncsSorted[0]) {
			if (!validateUUID(routeParent)) {
				setLastSelectedSync(syncsSorted[0].uuid)
				setSelectedSync(syncsSorted[0])

				navigate({
					to: "/syncs/$uuid",
					params: {
						uuid: syncsSorted[0].uuid
					}
				})
			} else {
				if (!selectedSync) {
					const foundSync = syncsSorted.filter(sync => sync.uuid === routeParent)

					if (foundSync.length === 1 && foundSync[0]) {
						setLastSelectedSync(foundSync[0].uuid)
						setSelectedSync(foundSync[0])
					}
				}
			}
		}
	}, [navigate, routeParent, syncsSorted, setLastSelectedSync, setSelectedSync, selectedSync])

	return (
		<Virtuoso
			ref={virtuosoRef}
			data={syncsSorted}
			totalCount={syncsSorted.length}
			height={windowSize.height - 85}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			components={components}
			style={{
				overflowX: "hidden",
				overflowY: "auto",
				height: windowSize.height - 85 + "px",
				width: "100%"
			}}
		/>
	)
})

export default Syncs
