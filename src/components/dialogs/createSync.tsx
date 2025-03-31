import { memo, useState, useEffect, useCallback, useMemo } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { Button } from "../ui/button"
import Input from "../input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Loader } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY, IS_DESKTOP } from "@/constants"
import { selectDriveItem } from "./selectDriveItem"
import useErrorToast from "@/hooks/useErrorToast"
import { validate as validateUUID, v4 as uuidv4 } from "uuid"
import useDesktopConfig, { getDesktopConfig } from "@/hooks/useDesktopConfig"
import { type SyncMode, type SyncPair } from "@filen/sync/dist/types"
import { Switch } from "../ui/switch"
import { showConfirmDialog } from "./confirm"

export function isSyncPathAlreadyInConfig(type: "local" | "remote", path: string): boolean {
	const desktopConfig = getDesktopConfig()
	const sep = type === "local" ? (window.desktopAPI.osPlatform() === "win32" ? "\\" : "/") : "/"
	const configuredPaths =
		type === "local"
			? desktopConfig.syncConfig.syncPairs.map(pair => pair.localPath)
			: desktopConfig.syncConfig.syncPairs.map(pair => pair.remotePath)

	for (const configuredPath of configuredPaths) {
		if (path.startsWith(configuredPath + sep) || configuredPath.startsWith(path + sep)) {
			return true
		}
	}

	return false
}

export function doesSyncNameExist(name: string): boolean {
	const desktopConfig = getDesktopConfig()

	return desktopConfig.syncConfig.syncPairs.some(pair => pair.name.trim() === name.trim())
}

export function tryingToSyncNetworkDrive(path: string): boolean {
	const desktopConfig = getDesktopConfig()
	const sep = window.desktopAPI.osPlatform() === "win32" ? "\\" : "/"

	return path.startsWith(desktopConfig.networkDriveConfig.mountPoint + sep)
}

export const CreateSyncDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [createState, setCreateState] = useState<{
		name: string
		localPath: string
		remotePath: string
		remoteUUID: string
		mode: SyncMode
		paused: boolean
		excludeDotFiles: boolean
		localTrashDisabled: boolean
	}>({
		name: "",
		localPath: "",
		remotePath: "",
		remoteUUID: "",
		mode: "twoWay",
		paused: true,
		excludeDotFiles: true,
		localTrashDisabled: false
	})
	const errorToast = useErrorToast()
	const [, setDesktopConfig] = useDesktopConfig()
	const [creating, setCreating] = useState<boolean>(false)

	const modeToString = useMemo(() => {
		switch (createState.mode) {
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
	}, [createState.mode, t])

	const resetInputs = useCallback(() => {
		setCreateState({
			name: "",
			localPath: "",
			remotePath: "",
			remoteUUID: "",
			mode: "twoWay",
			paused: true,
			excludeDotFiles: true,
			localTrashDisabled: false
		})
	}, [])

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)
	}, [])

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const create = useCallback(
		async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
			e.preventDefault()
			e.stopPropagation()

			if (
				createState.localPath.length === 0 ||
				createState.name.trim().length === 0 ||
				createState.remotePath.length === 0 ||
				createState.remoteUUID.length === 0 ||
				!validateUUID(createState.remoteUUID)
			) {
				return
			}

			setCreating(true)

			try {
				if (doesSyncNameExist(createState.name)) {
					errorToast(t("dialogs.createSync.errors.syncNameAlreadyExists", { name: createState.name.trim() }))

					return
				}

				if (isSyncPathAlreadyInConfig("local", createState.localPath)) {
					errorToast(t("dialogs.createSync.errors.localPathAlreadyConfigured"))

					return
				}

				if (isSyncPathAlreadyInConfig("remote", createState.remotePath)) {
					errorToast(t("dialogs.createSync.errors.remotePathAlreadyConfigured"))

					return
				}

				if (
					!(await window.desktopAPI.isPathWritable(createState.localPath)) ||
					!(await window.desktopAPI.isPathReadable(createState.localPath))
				) {
					errorToast(t("dialogs.createSync.errors.localPathNotWritable"))

					return
				}

				if (
					!(await window.desktopAPI.isAllowedToSyncDirectory(createState.localPath)) //||
					//tryingToSyncNetworkDrive(createState.localPath) ||
					//(await window.desktopAPI.tryingToSyncDesktop(createState.localPath))
				) {
					errorToast(t("dialogs.createSync.errors.invalidLocalPath"))

					return
				}

				/*if (window.desktopAPI.osPlatform() === "darwin" && (await window.desktopAPI.isPathSyncedByICloud(createState.localPath))) {
					errorToast(t("dialogs.createSync.errors.localPathSyncedByICloud"))

					return
				}

				const diskType = await window.desktopAPI.getDiskType(createState.localPath)

				if (diskType && !diskType.isPhysical) {
					if (
						!(await showConfirmDialog({
							title: t("dialogs.createSync.warnings.localDirectoryNotPhysical.title"),
							continueButtonText: t("dialogs.createSync.warnings.localDirectoryNotPhysical.continue"),
							description: t("dialogs.createSync.warnings.localDirectoryNotPhysical.description"),
							continueButtonVariant: "destructive"
						}))
					) {
						return
					}
				}*/

				const itemCount = await window.desktopAPI.getLocalDirectoryItemCount(createState.localPath)

				if (itemCount >= 100000) {
					if (
						!(await showConfirmDialog({
							title: t("dialogs.createSync.warnings.localDirectoryBig.title"),
							continueButtonText: t("dialogs.createSync.warnings.localDirectoryBig.continue"),
							description: t("dialogs.createSync.warnings.localDirectoryBig.description", {
								count: itemCount
							}),
							continueButtonVariant: "destructive"
						}))
					) {
						return
					}
				}

				const syncPair: SyncPair = {
					uuid: uuidv4(),
					remoteParentUUID: createState.remoteUUID,
					remotePath: createState.remotePath,
					localPath: createState.localPath,
					name: createState.name.trim(),
					mode: createState.mode,
					excludeDotFiles: createState.excludeDotFiles,
					paused: createState.paused,
					localTrashDisabled: createState.localTrashDisabled
				}

				setDesktopConfig(prev => ({
					...prev,
					syncConfig: {
						...prev.syncConfig,
						syncPairs: [...prev.syncConfig.syncPairs, syncPair]
					}
				}))

				resetInputs()
				close()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				setCreating(false)
			}
		},
		[createState, close, setDesktopConfig, t, errorToast, resetInputs]
	)

	const onModeChange = useCallback((mode: SyncMode) => {
		setCreateState(prev => ({
			...prev,
			mode
		}))
	}, [])

	const onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setCreateState(prev => ({
			...prev,
			name: e.target.value
		}))
	}, [])

	const onLocalTrashDisabledChange = useCallback((disabled: boolean) => {
		setCreateState(prev => ({
			...prev,
			localTrashDisabled: disabled
		}))
	}, [])

	const selectRemotePath = useCallback(async () => {
		try {
			const response = await selectDriveItem({
				type: "directory",
				multiple: false
			})

			if (response.cancelled) {
				return
			}

			const item = response.items[0]

			if (!item) {
				return
			}

			setCreateState(prev => ({
				...prev,
				remotePath: item.path,
				remoteUUID: item.uuid
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [errorToast])

	const selectLocalPath = useCallback(async () => {
		try {
			if (!IS_DESKTOP) {
				return
			}

			const response = await window.desktopAPI.selectDirectory(false)

			if (response.cancelled) {
				return
			}

			const path = response.paths[0]

			if (!path) {
				return
			}

			setCreateState(prev => ({
				...prev,
				localPath: path
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [errorToast])

	const onPausedChange = useCallback((paused: boolean) => {
		setCreateState(prev => ({
			...prev,
			paused
		}))
	}, [])

	const onExcludeDotFilesChange = useCallback((excludeDotFiles: boolean) => {
		setCreateState(prev => ({
			...prev,
			excludeDotFiles
		}))
	}, [])

	const preventDefault = useCallback((e: Event) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	useEffect(() => {
		if (!creating && open) {
			resetInputs()
		}
	}, [open, resetInputs, creating])

	useEffect(() => {
		const listener = eventEmitter.on("openCreateSyncDialog", () => {
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<AlertDialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<AlertDialogContent
				onEscapeKeyDown={close}
				className="outline-none focus:outline-none active:outline-none hover:outline-none select-none"
				onOpenAutoFocus={preventDefault}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("dialogs.createSync.title")}</AlertDialogTitle>
					<AlertDialogDescription asChild={true}>
						<div className="w-full h-full flex flex-col py-2 gap-4">
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground">{t("dialogs.createSync.name")}</p>
								<Input
									placeholder={t("dialogs.createSync.name")}
									value={createState.name}
									onChange={onNameChange}
									autoFocus={true}
								/>
							</div>
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground">{t("dialogs.createSync.localPath")}</p>
								<div className="flex flex-row gap-1 items-center">
									<Input
										placeholder={t("dialogs.createSync.localPath")}
										value={createState.localPath}
										onChange={e => e.preventDefault()}
									/>
									<Button
										size="sm"
										variant="default"
										onClick={selectLocalPath}
									>
										{t("dialogs.createSync.select")}
									</Button>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground">{t("dialogs.createSync.remotePath")}</p>
								<div className="flex flex-row gap-1 items-center">
									<Input
										placeholder={t("dialogs.createSync.remotePath")}
										value={createState.remotePath}
										onChange={e => e.preventDefault()}
									/>
									<Button
										size="sm"
										variant="default"
										onClick={selectRemotePath}
									>
										{t("dialogs.createSync.select")}
									</Button>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground">{t("dialogs.createSync.syncMode")}</p>
								<div className="flex flex-row gap-3 items-center">
									<Select onValueChange={onModeChange}>
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
														<p className="text-muted-foreground">
															{t("dialogs.createSync.mode.localToCloudInfo")}
														</p>
													</div>
													<div className="flex flex-col">
														<p>{t("dialogs.createSync.mode.localBackup")}</p>
														<p className="text-muted-foreground">
															{t("dialogs.createSync.mode.localBackupInfo")}
														</p>
													</div>
													<div className="flex flex-col">
														<p>{t("dialogs.createSync.mode.cloudToLocal")}</p>
														<p className="text-muted-foreground">
															{t("dialogs.createSync.mode.cloudToLocalInfo")}
														</p>
													</div>
													<div className="flex flex-col">
														<p>{t("dialogs.createSync.mode.cloudBackup")}</p>
														<p className="text-muted-foreground">
															{t("dialogs.createSync.mode.cloudBackupInfo")}
														</p>
													</div>
												</div>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</div>
							<div className="flex flex-row gap-4 items-center justify-between mt-2">
								<p className="text-muted-foreground">{t("dialogs.createSync.paused")}</p>
								<div className="flex flex-row gap-1 items-center">
									<Switch
										checked={createState.paused}
										onCheckedChange={onPausedChange}
									/>
								</div>
							</div>
							<div className="flex flex-row gap-4 items-center justify-between">
								<p className="text-muted-foreground">{t("dialogs.createSync.excludeDotFiles")}</p>
								<div className="flex flex-row gap-1 items-center">
									<Switch
										checked={createState.excludeDotFiles}
										onCheckedChange={onExcludeDotFilesChange}
									/>
								</div>
							</div>
							<div className="flex flex-row gap-4 items-center justify-between">
								<p className="text-muted-foreground">{t("dialogs.createSync.disableLocalTrash")}</p>
								<div className="flex flex-row gap-1 items-center">
									<Switch
										checked={createState.localTrashDisabled}
										onCheckedChange={onLocalTrashDisabledChange}
									/>
								</div>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="items-center mt-1">
					{!creating && <AlertDialogCancel onClick={close}>{t("dialogs.createSync.cancel")}</AlertDialogCancel>}
					<AlertDialogAction
						onClick={create}
						disabled={
							createState.name.length === 0 ||
							createState.localPath.length === 0 ||
							createState.remotePath.length === 0 ||
							createState.remoteUUID.length === 0
						}
					>
						{creating ? (
							<Loader
								size={18}
								className="animate-spin-medium"
							/>
						) : (
							t("dialogs.createSync.create")
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default CreateSyncDialog
