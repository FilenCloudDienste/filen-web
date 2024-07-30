import { memo, useCallback, useMemo } from "react"
import { type SyncPair, type SyncMode } from "@filen/sync/dist/types"
import Section from "@/components/settings/section"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import eventEmitter from "@/lib/eventEmitter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, ChevronsLeftRight, Cloud, ChevronLeft, ChevronRight, Archive, PcCase } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY } from "@/constants"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import FilenIgnoreDialog from "./dialogs/filenIgnore"
import { useSyncsStore } from "@/stores/syncs.store"
import { Button } from "@/components/ui/button"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"

export const Settings = memo(({ sync }: { sync: SyncPair }) => {
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()
	const { changing, setChanging } = useSyncsStore()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const syncConfig = useMemo(() => {
		return desktopConfig.syncConfig.syncPairs.filter(pair => pair.uuid === sync.uuid)[0] ?? null
	}, [sync.uuid, desktopConfig])

	const modeToString = useMemo(() => {
		switch (syncConfig?.mode) {
			case "twoWay": {
				return t("dialogs.createSync.mode.twoWay")
			}

			case "localToCloud": {
				return t("dialogs.createSync.mode.localToCloud")
			}

			case "localBackup": {
				return t("dialogs.createSync.mode.localBackup")
			}

			case "cloudToLocal": {
				return t("dialogs.createSync.mode.cloudToLocal")
			}

			case "cloudBackup": {
				return t("dialogs.createSync.mode.cloudBackup")
			}

			default: {
				return t("dialogs.createSync.mode.twoWay")
			}
		}
	}, [syncConfig, t])

	const togglePause = useCallback(() => {
		eventEmitter.emit("toggleSyncPause", sync.uuid)
	}, [sync.uuid])

	const deleteSync = useCallback(async () => {
		eventEmitter.emit("deleteSync", sync.uuid)
	}, [sync.uuid])

	const toggleExcludeDotFiles = useCallback(
		async (excludeDotFiles: boolean) => {
			setChanging(true)

			const toast = loadingToast()

			try {
				await window.desktopAPI.syncUpdateExcludeDotFiles({
					uuid: sync.uuid,
					excludeDotFiles
				})

				await window.desktopAPI.syncResetCache({
					uuid: sync.uuid
				})

				setDesktopConfig(prev => ({
					...prev,
					syncConfig: {
						...prev.syncConfig,
						syncPairs: prev.syncConfig.syncPairs.map(pair => (pair.uuid === sync.uuid ? { ...pair, excludeDotFiles } : pair))
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				setChanging(false)

				toast.dismiss()
			}
		},
		[setDesktopConfig, sync.uuid, setChanging, errorToast, loadingToast]
	)

	const onModeChange = useCallback(
		async (mode: SyncMode) => {
			setChanging(true)

			const toast = loadingToast()

			try {
				await window.desktopAPI.syncUpdateMode({
					uuid: sync.uuid,
					mode
				})

				await window.desktopAPI.syncResetCache({
					uuid: sync.uuid
				})

				setDesktopConfig(prev => ({
					...prev,
					syncConfig: {
						...prev.syncConfig,
						syncPairs: prev.syncConfig.syncPairs.map(pair => (pair.uuid === sync.uuid ? { ...pair, mode } : pair))
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				setChanging(false)

				toast.dismiss()
			}
		},
		[setDesktopConfig, sync.uuid, loadingToast, setChanging, errorToast]
	)

	const forceSync = useCallback(async () => {
		try {
			await window.desktopAPI.syncResetCache({
				uuid: sync.uuid
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [errorToast, sync.uuid])

	const editIgnore = useCallback(() => {
		eventEmitter.emit("openFilenIgnoreDialog", sync.uuid)
	}, [sync.uuid])

	const openLocalPath = useCallback(async () => {
		if (!syncConfig) {
			return
		}

		try {
			await window.desktopAPI.openLocalPath(syncConfig.localPath)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [syncConfig, errorToast])

	if (!syncConfig) {
		return null
	}

	return (
		<>
			<div className="flex flex-col w-full h-[100dvh] overflow-y-auto overflow-x-hidden">
				<div
					className="flex flex-col p-6 h-full"
					style={{
						width: settingsContainerSize.width
					}}
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-row items-center justify-between border-b pb-3 gap-3">
							<div className="flex flex-row items-center w-[45%] justify-start">
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<p
												className="line-clamp-1 text-ellipsis break-before-all cursor-pointer"
												onClick={openLocalPath}
											>
												{syncConfig.localPath}
											</p>
										</TooltipTrigger>
										<TooltipContent className="max-w-[calc(100vw/2)]">
											<p>{syncConfig.localPath}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<div className="flex flex-row items-center w-[10%] justify-center">
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<div className="flex flex-row gap-0.5 text-muted-foreground hover:text-primary">
												{syncConfig.mode === "twoWay" ? (
													<ChevronsLeftRight size={20} />
												) : syncConfig.mode === "cloudBackup" ? (
													<>
														<ChevronLeft size={20} />
														<Archive size={18} />
													</>
												) : syncConfig.mode === "localBackup" ? (
													<>
														<Archive size={18} />
														<ChevronRight size={20} />
													</>
												) : syncConfig.mode === "localToCloud" ? (
													<>
														<PcCase size={18} />
														<ChevronRight size={20} />
													</>
												) : syncConfig.mode === "cloudToLocal" ? (
													<>
														<ChevronLeft size={20} />
														<Cloud size={18} />
													</>
												) : (
													<ChevronsLeftRight size={20} />
												)}
											</div>
										</TooltipTrigger>
										<TooltipContent className="max-w-[calc(100vw/2)]">
											<p>{modeToString}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<div className="flex flex-row items-center w-[45%] justify-end">
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<p className="line-clamp-1 text-ellipsis break-before-all">{syncConfig.remotePath}</p>
										</TooltipTrigger>
										<TooltipContent className="max-w-[calc(100vw/2)]">
											<p>{syncConfig.remotePath}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
						<Section
							name={t("syncs.settings.sections.pause.name")}
							info={t("syncs.settings.sections.pause.info")}
							className="mt-10"
						>
							<Switch
								checked={syncConfig.paused}
								onCheckedChange={togglePause}
								disabled={changing}
							/>
						</Section>
						<Section
							name={t("syncs.settings.sections.mode.name")}
							info={t("syncs.settings.sections.mode.info")}
						>
							<div className="flex flex-row gap-3 items-center">
								<Select
									onValueChange={onModeChange}
									disabled={changing}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={modeToString} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="twoWay">{t("dialogs.createSync.mode.twoWay")}</SelectItem>
										<SelectItem value="localToCloud">{t("dialogs.createSync.mode.localToCloud")}</SelectItem>
										<SelectItem value="localBackup">{t("dialogs.createSync.mode.localBackup")}</SelectItem>
										<SelectItem value="cloudToLocal">{t("dialogs.createSync.mode.cloudToLocal")}</SelectItem>
										<SelectItem value="cloudBackup">{t("dialogs.createSync.mode.cloudBackup")}</SelectItem>
									</SelectContent>
								</Select>
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<Info className="hover:text-primary text-muted-foreground" />
										</TooltipTrigger>
										<TooltipContent>
											<div className="flex flex-col gap-3 max-w-96">
												<div className="flex flex-col">
													<p>{t("dialogs.createSync.mode.twoWay")}</p>
													<p className="text-muted-foreground">{t("dialogs.createSync.mode.twoWayInfo")}</p>
												</div>
												<div className="flex flex-col">
													<p>{t("dialogs.createSync.mode.localToCloud")}</p>
													<p className="text-muted-foreground">{t("dialogs.createSync.mode.localToCloudInfo")}</p>
												</div>
												<div className="flex flex-col">
													<p>{t("dialogs.createSync.mode.localBackup")}</p>
													<p className="text-muted-foreground">{t("dialogs.createSync.mode.localBackupInfo")}</p>
												</div>
												<div className="flex flex-col">
													<p>{t("dialogs.createSync.mode.cloudToLocal")}</p>
													<p className="text-muted-foreground">{t("dialogs.createSync.mode.cloudToLocalInfo")}</p>
												</div>
												<div className="flex flex-col">
													<p>{t("dialogs.createSync.mode.cloudBackup")}</p>
													<p className="text-muted-foreground">{t("dialogs.createSync.mode.cloudBackupInfo")}</p>
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</Section>
						<Section
							name={t("syncs.settings.sections.excludeDotFiles.name")}
							info={t("syncs.settings.sections.excludeDotFiles.info")}
						>
							<Switch
								checked={syncConfig.excludeDotFiles}
								onCheckedChange={toggleExcludeDotFiles}
								disabled={changing}
							/>
						</Section>
						<Section
							name={t("syncs.settings.sections.filenIgnore.name")}
							info={t("syncs.settings.sections.filenIgnore.info")}
						>
							<p
								className="text-blue-500 underline cursor-pointer"
								onClick={editIgnore}
							>
								{t("syncs.settings.sections.filenIgnore.edit")}
							</p>
						</Section>
						<Section
							name={t("syncs.settings.sections.forceSync.name")}
							info={t("syncs.settings.sections.forceSync.info")}
						>
							<Button
								variant="secondary"
								onClick={forceSync}
								size="sm"
							>
								{t("syncs.settings.sections.forceSync.forceSync")}
							</Button>
						</Section>
						<Section
							name={t("syncs.settings.sections.delete.name")}
							info={t("syncs.settings.sections.delete.info")}
							className="mt-10"
						>
							<Button
								variant="destructive"
								onClick={deleteSync}
								disabled={changing}
								size="sm"
							>
								{t("syncs.settings.sections.delete.delete")}
							</Button>
						</Section>
					</div>
				</div>
			</div>
			<FilenIgnoreDialog />
		</>
	)
})

export default Settings
