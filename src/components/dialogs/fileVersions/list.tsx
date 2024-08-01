import { memo, useCallback, useMemo } from "react"
import worker from "@/lib/worker"
import { useQuery } from "@tanstack/react-query"
import { type DriveCloudItem } from "@/components/drive"
import { Virtuoso } from "react-virtuoso"
import { FileVersion } from "@filen/sdk/dist/types/api/v3/file/versions"
import { Badge } from "@/components/ui/badge"
import { simpleDate, convertTimestampToMs } from "@/utils"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { showConfirmDialog } from "../confirm"
import eventEmitter from "@/lib/eventEmitter"
import { type FileEncryptionVersion } from "@filen/sdk"
import { Loader } from "lucide-react"
import { useTranslation } from "react-i18next"

export const List = memo(
	({ item, setItem }: { item: DriveCloudItem; setItem: React.Dispatch<React.SetStateAction<DriveCloudItem | null>> }) => {
		const loadingToast = useLoadingToast()
		const errorToast = useErrorToast()
		const { t } = useTranslation()

		const query = useQuery({
			queryKey: ["fileVersions", item.uuid],
			queryFn: () => worker.fileVersions({ uuid: item.uuid })
		})

		const versionsSorted = useMemo(() => {
			if (!query.isSuccess) {
				return []
			}

			return query.data.versions.sort((a, b) => b.timestamp - a.timestamp)
		}, [query.isSuccess, query.data])

		const restore = useCallback(
			async (version: FileVersion) => {
				const toast = loadingToast()

				try {
					const [newFileMetadata] = await Promise.all([
						worker.decryptFileMetadata({ metadata: version.metadata }),
						worker.restoreFileVersion({
							uuid: version.uuid,
							currentUUID: item.uuid
						})
					])

					setItem(prev =>
						prev
							? {
									...prev,
									...newFileMetadata,
									uuid: version.uuid,
									chunks: version.chunks,
									timestamp: version.timestamp,
									version: version.version as unknown as FileEncryptionVersion,
									region: version.region,
									rm: version.rm,
									bucket: version.bucket
								}
							: prev
					)

					await new Promise<void>(resolve => setTimeout(resolve, 100))
					await query.refetch()

					eventEmitter.emit("refetchDrive")
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				} finally {
					toast.dismiss()
				}
			},
			[loadingToast, errorToast, query, item.uuid, setItem]
		)

		const del = useCallback(
			async (version: FileVersion) => {
				if (
					!(await showConfirmDialog({
						title: t("dialogs.fileVersions.delete.title"),
						continueButtonText: t("dialogs.fileVersions.delete.continue"),
						description: t("dialogs.fileVersions.delete.description", {
							name: simpleDate(version.timestamp)
						}),
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}

				const toast = loadingToast()

				try {
					await worker.deleteFilePermanently({
						uuid: version.uuid
					})

					await query.refetch()

					eventEmitter.emit("refetchDrive")
				} catch (e) {
					console.error(e)

					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				} finally {
					toast.dismiss()
				}
			},
			[loadingToast, errorToast, query, t]
		)

		const getItemKey = useCallback((_: number, version: FileVersion) => version.uuid, [])

		const itemContent = useCallback(
			(_: number, version: FileVersion) => {
				return (
					<div className="flex flex-row items-center gap-4 py-2 pr-4">
						<div className="flex flex-row grow gap-2 items-center">
							{item.uuid === version.uuid && <Badge>Current</Badge>}
							<p>{simpleDate(convertTimestampToMs(version.timestamp))}</p>
						</div>
						{item.uuid !== version.uuid && (
							<div className="flex flex-row gap-4 items-center">
								<p
									className="text-blue-500 hover:underline cursor-pointer"
									onClick={() => restore(version)}
								>
									Restore
								</p>
								<p
									className="text-red-500 hover:underline cursor-pointer"
									onClick={() => del(version)}
								>
									Delete
								</p>
							</div>
						)}
					</div>
				)
			},
			[item.uuid, restore, del]
		)

		const components = useMemo(() => {
			return {
				EmptyPlaceholder: () => {
					return (
						<div className="flex flex-col items-center justify-center w-full h-full p-4">
							<Loader className="animate-spin-medium" />
						</div>
					)
				}
			}
		}, [])

		const style = useMemo((): React.CSSProperties => {
			return {
				overflowX: "hidden",
				overflowY: "auto",
				height: 384 + "px",
				width: "100%"
			}
		}, [])

		return (
			<Virtuoso
				data={versionsSorted}
				totalCount={versionsSorted.length}
				height={384}
				width="100%"
				computeItemKey={getItemKey}
				itemContent={itemContent}
				components={components}
				style={style}
			/>
		)
	}
)

export default List
