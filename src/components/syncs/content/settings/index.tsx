import { memo, useCallback, useMemo, useState } from "react"
import { type SyncPair, type SyncMode } from "@filen/sync/dist/types"
import Section from "@/components/settings/section"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import eventEmitter from "@/lib/eventEmitter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, ChevronsLeftRight, Cloud, ChevronLeft, ChevronRight, Archive, PcCase, RefreshCw, Edit } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY, DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import FilenIgnoreDialog from "./dialogs/filenIgnore"
import { useSyncsStore } from "@/stores/syncs.store"
import { Button } from "@/components/ui/button"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import useIsSyncActive from "@/hooks/useIsSyncActive"
import useWindowSize from "@/hooks/useWindowSize"
import { setItem } from "@/lib/localForage"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showInputDialog } from "@/components/dialogs/input"
import { doesSyncNameExist } from "@/components/dialogs/createSync"

export const Settings = memo(({ sync }: { sync: SyncPair }) => {
	const [, setDesktopConfig] = useDesktopConfig()
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()
	const { changing, setChanging, setSelectedSync, setTransferEvents } = useSyncsStore(
		useCallback(
			state => ({
				changing: state.changing,
				setChanging: state.setChanging,
				setSelectedSync: state.setSelectedSync,
				setTransferEvents: state.setTransferEvents
			}),
			[]
		)
	)
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const [isForcingSync, setIsForcingSync] = useState<boolean>(false)
	const isSyncActive = useIsSyncActive(sync.uuid)
	const windowSize = useWindowSize()

	const settingsHeight = useMemo(() => {
		return windowSize.height - 64 - 13 - DESKTOP_TOPBAR_HEIGHT
	}, [windowSize.height])

	const modeToString = useMemo(() => {
		switch (sync.mode) {
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
	}, [sync.mode, t])

	const togglePause = useCallback(() => {
		eventEmitter.emit("toggleSyncPause", sync.uuid)
	}, [sync.uuid])

	const deleteSync = useCallback(async () => {
		eventEmitter.emit("deleteSync", sync.uuid)
	}, [sync.uuid])

	const editName = useCallback(async () => {
		const inputResponse = await showInputDialog({
			title: t("syncs.dialogs.name.title"),
			continueButtonText: t("syncs.dialogs.name.continue"),
			value: sync.name,
			autoFocusInput: true,
			placeholder: t("syncs.dialogs.name.placeholder")
		})

		if (inputResponse.cancelled || inputResponse.value.trim().length === 0 || inputResponse.value.trim() === sync.name) {
			return
		}

		if (doesSyncNameExist(inputResponse.value)) {
			errorToast(t("dialogs.createSync.errors.syncNameAlreadyExists", { name: inputResponse.value.trim() }))

			return
		}

		setSelectedSync(prev =>
			prev && prev.uuid === sync.uuid
				? {
						...prev,
						name: inputResponse.value.trim()
					}
				: prev
		)

		setDesktopConfig(prev => ({
			...prev,
			syncConfig: {
				...prev.syncConfig,
				syncPairs: prev.syncConfig.syncPairs.map(pair =>
					pair.uuid === sync.uuid
						? {
								...pair,
								name: inputResponse.value.trim()
							}
						: pair
				)
			}
		}))
	}, [sync.uuid, setDesktopConfig, t, sync.name, setSelectedSync, errorToast])

	const clearTransferEvents = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: t("syncs.dialogs.clearTransferEvents.title"),
				continueButtonText: t("syncs.dialogs.clearTransferEvents.continue"),
				description: t("syncs.dialogs.clearTransferEvents.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		try {
			await setItem("syncTransferEvents:" + sync.uuid, [])

			setTransferEvents(prev => ({
				...prev,
				[sync.uuid]: []
			}))
		} catch (e) {
			console.error(e)
		}
	}, [sync.uuid, setTransferEvents, t])

	const toggleLocalTrashDisabled = useCallback(
		async (enabled: boolean) => {
			if (isSyncActive) {
				return
			}

			setChanging(true)

			const toast = loadingToast()

			try {
				await window.desktopAPI.syncToggleLocalTrash({
					uuid: sync.uuid,
					enabled
				})

				await window.desktopAPI.syncResetCache({
					uuid: sync.uuid
				})

				setSelectedSync(prev =>
					prev && prev.uuid === sync.uuid
						? {
								...prev,
								localTrashDisabled: enabled
							}
						: prev
				)

				setDesktopConfig(prev => ({
					...prev,
					syncConfig: {
						...prev.syncConfig,
						syncPairs: prev.syncConfig.syncPairs.map(pair =>
							pair.uuid === sync.uuid
								? {
										...pair,
										localTrashDisabled: enabled
									}
								: pair
						)
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
		[setDesktopConfig, sync.uuid, setChanging, errorToast, loadingToast, setSelectedSync, isSyncActive]
	)

	const toggleRequireConfirmationOnLargeDeletion = useCallback(
		async (requireConfirmationOnLargeDeletion: boolean) => {
			if (isSyncActive) {
				return
			}

			setChanging(true)

			const toast = loadingToast()

			try {
				await window.desktopAPI.syncUpdateRequireConfirmationOnLargeDeletions({
					uuid: sync.uuid,
					requireConfirmationOnLargeDeletions: requireConfirmationOnLargeDeletion
				})

				setSelectedSync(prev =>
					prev && prev.uuid === sync.uuid
						? {
								...prev,
								requireConfirmationOnLargeDeletion
							}
						: prev
				)

				setDesktopConfig(prev => ({
					...prev,
					syncConfig: {
						...prev.syncConfig,
						syncPairs: prev.syncConfig.syncPairs.map(pair =>
							pair.uuid === sync.uuid
								? {
										...pair,
										requireConfirmationOnLargeDeletion
									}
								: pair
						)
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
		[setDesktopConfig, sync.uuid, setChanging, errorToast, loadingToast, setSelectedSync, isSyncActive]
	)

	const toggleExcludeDotFiles = useCallback(
		async (excludeDotFiles: boolean) => {
			if (isSyncActive) {
				return
			}

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

				setSelectedSync(prev =>
					prev && prev.uuid === sync.uuid
						? {
								...prev,
								excludeDotFiles
							}
						: prev
				)

				setDesktopConfig(prev => ({
					...prev,
					syncConfig: {
						...prev.syncConfig,
						syncPairs: prev.syncConfig.syncPairs.map(pair =>
							pair.uuid === sync.uuid
								? {
										...pair,
										excludeDotFiles
									}
								: pair
						)
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
		[setDesktopConfig, sync.uuid, setChanging, errorToast, loadingToast, setSelectedSync, isSyncActive]
	)

	const onModeChange = useCallback(
		async (mode: SyncMode) => {
			if (isSyncActive) {
				return
			}

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

				setSelectedSync(prev =>
					prev && prev.uuid === sync.uuid
						? {
								...prev,
								mode
							}
						: prev
				)

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
		[setDesktopConfig, sync.uuid, loadingToast, setChanging, errorToast, setSelectedSync, isSyncActive]
	)

	const forceSync = useCallback(async () => {
		if (isForcingSync || isSyncActive) {
			return
		}

		setIsForcingSync(true)

		try {
			await window.desktopAPI.syncResetCache({
				uuid: sync.uuid
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setTimeout(() => {
				setIsForcingSync(false)
			}, 1000)
		}
	}, [errorToast, sync.uuid, isForcingSync, isSyncActive])

	const editIgnore = useCallback(() => {
		if (isSyncActive) {
			return
		}

		eventEmitter.emit("openFilenIgnoreDialog", sync.uuid)
	}, [sync.uuid, isSyncActive])

	const openLocalPath = useCallback(async () => {
		try {
			await window.desktopAPI.openLocalPath(sync.localPath)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [sync.localPath, errorToast])

	return (
		<>
			<div
				className="flex flex-col w-full overflow-y-auto overflow-x-hidden"
				style={{
					height: settingsHeight
				}}
			>
				<div
					className="flex flex-col p-6 h-full"
					style={{
						width: settingsContainerSize.width
					}}
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-row items-center -mt-4">
							<p
								className="line-clamp-1 text-ellipsis break-all text-xl cursor-pointer"
								onClick={editName}
							>
								{sync.name}
							</p>
						</div>
						<div className="flex flex-row items-center justify-between border-b pb-3 gap-3 mt-2">
							<div className="flex flex-row items-center w-[45%] justify-start">
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<p
												className="line-clamp-1 text-ellipsis break-before-all cursor-pointer"
												onClick={openLocalPath}
											>
												{sync.localPath}
											</p>
										</TooltipTrigger>
										<TooltipContent className="max-w-[calc(100vw/2)]">
											<p>{sync.localPath}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<div className="flex flex-row items-center w-[10%] justify-center">
								<TooltipProvider delayDuration={TOOLTIP_POPUP_DELAY}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<div className="flex flex-row gap-0.5 text-muted-foreground hover:text-primary">
												{sync.mode === "twoWay" ? (
													<ChevronsLeftRight size={20} />
												) : sync.mode === "cloudBackup" ? (
													<>
														<ChevronLeft size={20} />
														<Archive size={18} />
													</>
												) : sync.mode === "localBackup" ? (
													<>
														<Archive size={18} />
														<ChevronRight size={20} />
													</>
												) : sync.mode === "localToCloud" ? (
													<>
														<PcCase size={18} />
														<ChevronRight size={20} />
													</>
												) : sync.mode === "cloudToLocal" ? (
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
											<p className="line-clamp-1 text-ellipsis break-before-all">{sync.remotePath}</p>
										</TooltipTrigger>
										<TooltipContent className="max-w-[calc(100vw/2)]">
											<p>{sync.remotePath}</p>
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
								checked={sync.paused}
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
									disabled={changing || isSyncActive}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={modeToString} />
									</SelectTrigger>
									<SelectContent className="max-h-[200px]">
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
								checked={sync.excludeDotFiles}
								onCheckedChange={toggleExcludeDotFiles}
								disabled={changing || isSyncActive}
							/>
						</Section>
						{(sync.mode === "twoWay" || sync.mode === "cloudBackup" || sync.mode === "cloudToLocal") && (
							<Section
								name={t("syncs.settings.sections.disableLocalTrash.name")}
								info={t("syncs.settings.sections.disableLocalTrash.info")}
							>
								<Switch
									checked={sync.localTrashDisabled}
									onCheckedChange={toggleLocalTrashDisabled}
									disabled={changing || isSyncActive}
								/>
							</Section>
						)}
						<Section
							name={t("syncs.settings.sections.requireConfirmationOnLargeDeletion.name")}
							info={t("syncs.settings.sections.requireConfirmationOnLargeDeletion.info")}
						>
							<Switch
								checked={
									typeof sync.requireConfirmationOnLargeDeletion === "boolean"
										? sync.requireConfirmationOnLargeDeletion
										: false
								}
								onCheckedChange={toggleRequireConfirmationOnLargeDeletion}
								disabled={changing || isSyncActive}
							/>
						</Section>
						<Section
							name={t("syncs.settings.sections.name.name")}
							info={t("syncs.settings.sections.name.info")}
						>
							<Button
								onClick={editName}
								variant="secondary"
								size="sm"
								disabled={changing || isSyncActive}
							>
								<Edit size={18} />
							</Button>
						</Section>
						<Section
							name={t("syncs.settings.sections.filenIgnore.name")}
							info={t("syncs.settings.sections.filenIgnore.info")}
						>
							<Button
								onClick={editIgnore}
								variant="secondary"
								size="sm"
								disabled={changing || isSyncActive}
							>
								<Edit size={18} />
							</Button>
						</Section>
						<Section
							name={t("syncs.settings.sections.forceSync.name")}
							info={t("syncs.settings.sections.forceSync.info")}
						>
							<Button
								variant="secondary"
								onClick={forceSync}
								size="sm"
								disabled={isForcingSync || changing || isSyncActive}
							>
								{isForcingSync ? (
									<RefreshCw
										size={18}
										className="animate-spin-medium"
									/>
								) : (
									t("syncs.settings.sections.forceSync.forceSync")
								)}
							</Button>
						</Section>
						<Section
							name={t("syncs.settings.sections.clearTransferEvents.name")}
							info={t("syncs.settings.sections.clearTransferEvents.info")}
						>
							<Button
								variant="secondary"
								onClick={clearTransferEvents}
								size="sm"
								disabled={isForcingSync || changing || isSyncActive}
							>
								{t("syncs.settings.sections.clearTransferEvents.clear")}
							</Button>
						</Section>
						<Section
							name={t("syncs.settings.sections.delete.name")}
							info={t("syncs.settings.sections.delete.info")}
							className="mt-10 mb-20"
						>
							<Button
								variant="destructive"
								onClick={deleteSync}
								disabled={changing || isForcingSync || isSyncActive}
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
