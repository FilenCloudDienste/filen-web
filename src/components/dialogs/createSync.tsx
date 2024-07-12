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
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TOOLTIP_POPUP_DELAY, IS_DESKTOP } from "@/constants"
import { selectDriveItem } from "./selectDriveItem"
import useErrorToast from "@/hooks/useErrorToast"
import { validate as validateUUID, v4 as uuidv4 } from "uuid"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import { type SyncMode } from "@filen/sync/dist/types"

export const CreateSyncDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [createState, setCreateState] = useState<{
		name: string
		localPath: string
		remotePath: string
		remoteUUID: string
		mode: SyncMode
	}>({
		name: "",
		localPath: "",
		remotePath: "",
		remoteUUID: "",
		mode: "twoWay"
	})
	const errorToast = useErrorToast()
	const [, setDesktopConfig] = useDesktopConfig()

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

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)
	}, [])

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const create = useCallback(() => {
		if (
			createState.localPath.length === 0 ||
			createState.name.length === 0 ||
			createState.remotePath.length === 0 ||
			createState.remoteUUID.length === 0 ||
			!validateUUID(createState.remoteUUID)
		) {
			return
		}

		const syncPair = {
			uuid: uuidv4(),
			remoteParentUUID: createState.remoteUUID,
			remotePath: createState.remotePath,
			localPath: createState.localPath,
			name: createState.name,
			mode: createState.mode,
			excludeDotFiles: true,
			paused: false
		}

		setDesktopConfig(prev => ({
			...prev,
			syncConfig: {
				...prev.syncConfig,
				syncPairs: [...prev.syncConfig.syncPairs, syncPair]
			}
		}))

		setCreateState({
			name: "",
			localPath: "",
			remotePath: "",
			remoteUUID: "",
			mode: "twoWay"
		})

		close()
	}, [createState, close, setDesktopConfig])

	const onModeChange = useCallback((mode: SyncMode) => {
		setCreateState(prev => ({
			...prev,
			mode
		}))
	}, [])

	const onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setCreateState(prev => ({
			...prev,
			name: e.target.value.trim()
		}))
	}, [])

	const selectRemotePath = useCallback(async () => {
		try {
			const response = await selectDriveItem({
				type: "directory",
				multiple: false
			})

			if (response.cancelled || !response.items[0]) {
				return
			}

			setCreateState(prev => ({
				...prev,
				remotePath: response.items[0]!.path,
				remoteUUID: response.items[0]!.uuid
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

			if (response.cancelled || !response.paths[0]) {
				return
			}

			if (!(await window.desktopAPI.isPathWritable(response.paths[0]))) {
				errorToast(t("dialogs.createSync.errors.localPathNotWritable"))

				return
			}

			setCreateState(prev => ({
				...prev,
				localPath: response.paths[0]!
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [errorToast, t])

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
												<Info className="cursor-pointer hover:text-primary" />
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
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="items-center mt-1">
					<AlertDialogCancel onClick={close}>{t("dialogs.createSync.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={create}
						disabled={
							createState.name.length === 0 ||
							createState.localPath.length === 0 ||
							createState.remotePath.length === 0 ||
							createState.remoteUUID.length === 0
						}
					>
						{t("dialogs.createSync.create")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
})

export default CreateSyncDialog
