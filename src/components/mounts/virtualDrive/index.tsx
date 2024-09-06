import { memo, useCallback, useEffect, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Section from "@/components/settings/section"
import { useTranslation } from "react-i18next"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import { CheckCircle, XCircle, Loader, Edit, ArrowRight } from "lucide-react"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import useErrorToast from "@/hooks/useErrorToast"
import { useQuery } from "@tanstack/react-query"
import eventEmitter from "@/lib/eventEmitter"
import Skeletons from "@/components/settings/skeletons"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/utils"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { generateCacheSteps } from "./utils"
import Input from "@/components/input"
import { useMountsStore } from "@/stores/mounts.store"
import Transfers from "./transfers"

export async function isVirtualDriveMounted(): Promise<{ mounted: boolean }> {
	const [mounted, active] = await Promise.all([window.desktopAPI.isVirtualDriveMounted(), window.desktopAPI.isVirtualDriveActive()])

	return {
		mounted: mounted && active
	}
}

export async function areDependenciesInstalled(): Promise<{ installed: boolean }> {
	if (window.desktopAPI.osPlatform() === "win32") {
		return {
			installed: await window.desktopAPI.isWinFSPInstalled()
		}
	}

	if (window.desktopAPI.osPlatform() === "linux") {
		return {
			installed: await window.desktopAPI.isFUSE3InstalledOnLinux()
		}
	}

	return {
		installed: true
	}
}

export const VirtualDrive = memo(() => {
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()
	const { enablingVirtualDrive, setEnablingVirtualDrive } = useMountsStore(
		useCallback(
			state => ({
				enablingVirtualDrive: state.enablingVirtualDrive,
				setEnablingVirtualDrive: state.setEnablingVirtualDrive
			}),
			[]
		)
	)
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const errorToast = useErrorToast()

	const isMountedQuery = useQuery({
		queryKey: ["isVirtualDriveMounted"],
		queryFn: () => isVirtualDriveMounted()
	})

	const availableDrivesQuery = useQuery({
		queryKey: ["getAvailableDrives"],
		queryFn: () => (window.desktopAPI.osPlatform() === "win32" ? window.desktopAPI.getAvailableDrives() : Promise.resolve([]))
	})

	const cacheSizeQuery = useQuery({
		queryKey: ["virtualDriveCacheSize"],
		queryFn: () => window.desktopAPI.virtualDriveCacheSize()
	})

	const availableCacheSizeQuery = useQuery({
		queryKey: ["virtualDriveAvailableCache"],
		queryFn: () => window.desktopAPI.virtualDriveAvailableCache()
	})

	const dependenciesQuery = useQuery({
		queryKey: ["virtualDriveDependencies"],
		queryFn: () => areDependenciesInstalled()
	})

	const cacheSteps = useMemo(() => {
		if (!availableCacheSizeQuery.isSuccess) {
			return [10]
		}

		return generateCacheSteps(Math.floor(availableCacheSizeQuery.data / (1024 * 1024 * 1024)))
	}, [availableCacheSizeQuery.isSuccess, availableCacheSizeQuery.data])

	const availableDrives = useMemo(() => {
		if (!availableDrivesQuery.isSuccess || window.desktopAPI.osPlatform() !== "win32") {
			return []
		}

		return [
			...availableDrivesQuery.data.filter(letter => letter !== desktopConfig.virtualDriveConfig.mountPoint),
			desktopConfig.virtualDriveConfig.mountPoint
		]
	}, [availableDrivesQuery.isSuccess, availableDrivesQuery.data, desktopConfig.virtualDriveConfig.mountPoint])

	const changeMountPoint = useCallback(async () => {
		if (enablingVirtualDrive) {
			return
		}

		let mountPoint: string | null = null

		try {
			const selectDirectoryResult = await window.desktopAPI.selectDirectory(false)

			if (selectDirectoryResult.cancelled || !selectDirectoryResult.paths[0]) {
				return
			}

			mountPoint = selectDirectoryResult.paths[0]!
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			return
		}

		if (!mountPoint) {
			return
		}

		setEnablingVirtualDrive(true)

		try {
			if (window.desktopAPI.osPlatform() !== "win32" && !(await window.desktopAPI.isUnixMountPointValid(mountPoint))) {
				errorToast(t("mounts.virtualDrive.errors.invalidMountPoint"))

				return
			}

			if (window.desktopAPI.osPlatform() !== "win32" && !(await window.desktopAPI.isUnixMountPointEmpty(mountPoint))) {
				errorToast(t("mounts.virtualDrive.errors.mountPointNotEmpty"))

				return
			}

			await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch()])

			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					mountPoint: mountPoint!
				}
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingVirtualDrive(false)
		}
	}, [enablingVirtualDrive, setEnablingVirtualDrive, errorToast, setDesktopConfig, isMountedQuery, availableDrivesQuery, t])

	const onDriveLetterChange = useCallback(
		async (letter: string) => {
			if (enablingVirtualDrive) {
				return
			}

			setEnablingVirtualDrive(true)

			try {
				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch()])

				setDesktopConfig(prev => ({
					...prev,
					virtualDriveConfig: {
						...prev.virtualDriveConfig,
						mountPoint: letter
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					virtualDriveConfig: {
						...prev.virtualDriveConfig,
						enabled: false
					}
				}))
			} finally {
				setEnablingVirtualDrive(false)
			}
		},
		[enablingVirtualDrive, setEnablingVirtualDrive, errorToast, setDesktopConfig, isMountedQuery, availableDrivesQuery]
	)

	const onEnabledChanged = useCallback(
		async (enabled: boolean) => {
			if (enablingVirtualDrive) {
				return
			}

			if (
				!enabled &&
				!(await showConfirmDialog({
					title: t("mounts.virtualDrive.dialogs.disable.title"),
					continueButtonText: t("mounts.virtualDrive.dialogs.disable.continue"),
					description: t("mounts.virtualDrive.dialogs.disable.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			setEnablingVirtualDrive(true)

			try {
				if (enabled) {
					if (
						window.desktopAPI.osPlatform() !== "win32" &&
						!(await window.desktopAPI.doesPathStartWithHomeDir(desktopConfig.virtualDriveConfig.mountPoint))
					) {
						errorToast(
							window.desktopAPI.osPlatform() === "linux"
								? t("mounts.virtualDrive.errors.pathNotInHomeDir")
								: t("mounts.virtualDrive.errors.pathNotInUserDir")
						)

						return
					}

					if (
						window.desktopAPI.osPlatform() !== "win32" &&
						!(await window.desktopAPI.isUnixMountPointValid(desktopConfig.virtualDriveConfig.mountPoint))
					) {
						errorToast(t("mounts.virtualDrive.errors.invalidMountPoint"))

						return
					}

					if (
						window.desktopAPI.osPlatform() !== "win32" &&
						!(await window.desktopAPI.isUnixMountPointEmpty(desktopConfig.virtualDriveConfig.mountPoint))
					) {
						errorToast(t("mounts.virtualDrive.errors.mountPointNotEmpty"))

						return
					}

					await window.desktopAPI.restartVirtualDrive()

					if (!(await isVirtualDriveMounted()).mounted) {
						throw new Error("Could not start virtual drive.")
					}
				} else {
					await window.desktopAPI.stopVirtualDrive()
				}

				await Promise.all([
					isMountedQuery.refetch(),
					availableDrivesQuery.refetch(),
					cacheSizeQuery.refetch(),
					availableCacheSizeQuery.refetch()
				])

				setDesktopConfig(prev => ({
					...prev,
					virtualDriveConfig: {
						...prev.virtualDriveConfig,
						enabled
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					virtualDriveConfig: {
						...prev.virtualDriveConfig,
						enabled: false
					}
				}))
			} finally {
				setEnablingVirtualDrive(false)
			}
		},
		[
			setDesktopConfig,
			enablingVirtualDrive,
			setEnablingVirtualDrive,
			errorToast,
			isMountedQuery,
			availableDrivesQuery,
			t,
			desktopConfig.virtualDriveConfig.mountPoint,
			cacheSizeQuery,
			availableCacheSizeQuery
		]
	)

	const onCacheChange = useCallback(
		async (size: string) => {
			if (enablingVirtualDrive) {
				return
			}

			setEnablingVirtualDrive(true)

			try {
				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch(), availableCacheSizeQuery.refetch()])

				setDesktopConfig(prev => ({
					...prev,
					virtualDriveConfig: {
						...prev.virtualDriveConfig,
						cacheSizeInGi: parseInt(size)
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					virtualDriveConfig: {
						...prev.virtualDriveConfig,
						enabled: false
					}
				}))
			} finally {
				setEnablingVirtualDrive(false)
			}
		},
		[
			enablingVirtualDrive,
			setEnablingVirtualDrive,
			errorToast,
			setDesktopConfig,
			isMountedQuery,
			availableDrivesQuery,
			availableCacheSizeQuery
		]
	)

	const browse = useCallback(async () => {
		if (!desktopConfig.virtualDriveConfig.enabled) {
			return
		}

		try {
			if (!(await isVirtualDriveMounted()).mounted) {
				return
			}

			await window.desktopAPI.openLocalPath(`${desktopConfig.virtualDriveConfig.mountPoint}\\`)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [desktopConfig.virtualDriveConfig.mountPoint, desktopConfig.virtualDriveConfig.enabled, errorToast])

	const cleanupCache = useCallback(async () => {
		if (enablingVirtualDrive) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("mounts.virtualDrive.dialogs.cleanupCache.title"),
				continueButtonText: t("mounts.virtualDrive.dialogs.cleanupCache.continue"),
				description: t("mounts.virtualDrive.dialogs.cleanupCache.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		setEnablingVirtualDrive(true)

		try {
			await window.desktopAPI.virtualDriveCleanupCache()

			await Promise.all([cacheSizeQuery.refetch(), isMountedQuery.refetch(), availableDrivesQuery.refetch()])
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingVirtualDrive(false)
		}
	}, [
		errorToast,
		cacheSizeQuery,
		t,
		isMountedQuery,
		availableDrivesQuery,
		enablingVirtualDrive,
		setEnablingVirtualDrive,
		setDesktopConfig
	])

	const openDependenciesInstructions = useCallback(() => {
		if (window.desktopAPI.osPlatform() === "win32") {
			window.open("https://winfsp.dev/rel/", "_blank")
		}

		if (window.desktopAPI.osPlatform() === "linux") {
			window.open("https://launchpad.net/ubuntu/+source/fuse3", "_blank")
		}
	}, [])

	const changeCachePath = useCallback(async () => {
		if (enablingVirtualDrive) {
			return
		}

		setEnablingVirtualDrive(true)

		try {
			const path = await window.desktopAPI.selectDirectory(false)

			if (path.cancelled || !path.paths[0]) {
				return
			}

			if (path.paths[0].startsWith(desktopConfig.virtualDriveConfig.mountPoint)) {
				errorToast(t("mounts.virtualDrive.errors.invalidCachePath"))

				return
			}

			if (!(await window.desktopAPI.isPathReadable(path.paths[0])) || !(await window.desktopAPI.isPathWritable(path.paths[0]))) {
				errorToast(t("mounts.virtualDrive.errors.cachePathNotReadableWritable"))

				return
			}

			if (path.paths[0].length > 100) {
				errorToast(t("mounts.virtualDrive.errors.invalidCachePathLength"))

				return
			}

			const diskType = await window.desktopAPI.getDiskType(path.paths[0])

			if (diskType && !diskType.isPhysical) {
				errorToast(t("mounts.virtualDrive.errors.invalidCachePath"))

				return
			}

			await Promise.all([
				isMountedQuery.refetch(),
				availableDrivesQuery.refetch(),
				availableCacheSizeQuery.refetch(),
				cacheSizeQuery.refetch()
			])

			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					cachePath: path.paths[0]!
				}
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingVirtualDrive(false)
		}
	}, [
		availableCacheSizeQuery,
		availableDrivesQuery,
		enablingVirtualDrive,
		errorToast,
		isMountedQuery,
		setDesktopConfig,
		setEnablingVirtualDrive,
		t,
		cacheSizeQuery,
		desktopConfig.virtualDriveConfig.mountPoint
	])

	const onReadOnlyChange = useCallback(
		(readOnly: boolean) => {
			setDesktopConfig(prev => ({
				...prev,
				virtualDriveConfig: {
					...prev.virtualDriveConfig,
					readOnly
				}
			}))
		},
		[setDesktopConfig]
	)

	useEffect(() => {
		const refetchVirtualDriveListener = eventEmitter.on("refetchVirtualDrive", () => {
			isMountedQuery.refetch().catch(console.error)
		})

		return () => {
			refetchVirtualDriveListener.remove()
		}
	}, [isMountedQuery])

	if (!isMountedQuery.data || !availableDrivesQuery.isSuccess || !availableCacheSizeQuery.isSuccess || !dependenciesQuery.isSuccess) {
		return <Skeletons />
	}

	if (!dependenciesQuery.data.installed) {
		return (
			<div className="flex flex-col items-center justify-center overflow-hidden h-[calc(100dvh-48px)]">
				<p>{t("mounts.virtualDrive.missingDeps")}</p>
				<p className="text-muted-foreground text-sm">
					{window.desktopAPI.osPlatform() === "win32"
						? t("mounts.virtualDrive.missingDepsWindows")
						: t("mounts.virtualDrive.missingDepsLinux")}
				</p>
				<Button
					className="mt-4 gap-2 items-center"
					size="sm"
					onClick={openDependenciesInstructions}
				>
					<ArrowRight size={16} />
					{t("mounts.virtualDrive.missingDepsInstructions")}
				</Button>
			</div>
		)
	}

	return (
		<div className="flex flex-col w-full h-[100dvh] overflow-hidden">
			<div className="overflow-x-hidden overflow-y-auto h-[calc(100dvh-88px)]">
				<div
					className="flex flex-col p-6 h-full"
					style={{
						width: settingsContainerSize.width
					}}
				>
					<div className="flex flex-col gap-4">
						<Section
							name={t("mounts.virtualDrive.sections.active.name")}
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "drag"
							}}
						>
							{enablingVirtualDrive ? (
								<Loader className="animate-spin-medium" />
							) : isMountedQuery.data.mounted ? (
								<div className="flex flex-row gap-3">
									<CheckCircle className="text-green-500" />
								</div>
							) : (
								<XCircle className="text-red-500" />
							)}
						</Section>
						<div className="flex flex-col gap-3">
							<p className="text-muted-foreground text-sm">
								{window.desktopAPI.osPlatform() === "win32"
									? t("mounts.virtualDrive.description")
									: t("mounts.virtualDrive.unixDescription")}
							</p>
							<p className="text-muted-foreground text-sm">{t("mounts.virtualDrive.limitations")}</p>
							{window.desktopAPI.osPlatform() !== "win32" && (
								<p className="text-muted-foreground text-sm">{t("mounts.virtualDrive.unixSudo")}</p>
							)}
						</div>
						<Section
							name={t("mounts.virtualDrive.sections.enabled.name")}
							info={t("mounts.virtualDrive.sections.enabled.info")}
							className="mt-10"
						>
							<Switch
								disabled={enablingVirtualDrive}
								checked={isMountedQuery.isSuccess && isMountedQuery.data.mounted}
								onCheckedChange={onEnabledChanged}
							/>
						</Section>
						{window.desktopAPI.osPlatform() === "win32" ? (
							<Section
								name={t("mounts.virtualDrive.sections.driveLetter.name")}
								info={t("mounts.virtualDrive.sections.driveLetter.info")}
							>
								<Select
									onValueChange={onDriveLetterChange}
									value={desktopConfig.virtualDriveConfig.mountPoint}
									disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
								>
									<SelectTrigger className="min-w-[120px]">
										<SelectValue placeholder={desktopConfig.virtualDriveConfig.mountPoint} />
									</SelectTrigger>
									<SelectContent className="max-h-[200px]">
										{availableDrives.map(letter => {
											return (
												<SelectItem
													key={letter}
													value={letter}
												>
													{letter}
												</SelectItem>
											)
										})}
									</SelectContent>
								</Select>
							</Section>
						) : (
							<Section
								name={t("mounts.virtualDrive.sections.mountPoint.name")}
								info={t("mounts.virtualDrive.sections.mountPoint.info")}
							>
								<div className="flex flex-row gap-1 items-center">
									<Input
										value={desktopConfig.virtualDriveConfig.mountPoint}
										type="text"
										onChange={e => {
											e.preventDefault()
											e.target.blur()
										}}
										className="min-w-[250px]"
										autoCapitalize="none"
										autoComplete="none"
										autoCorrect="none"
										disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
									/>
									<Button
										size="sm"
										onClick={changeMountPoint}
										disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
									>
										<Edit size={18} />
									</Button>
								</div>
							</Section>
						)}
						<Section
							name={t("mounts.virtualDrive.sections.readOnly.name")}
							info={t("mounts.virtualDrive.sections.readOnly.info")}
						>
							<Switch
								disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
								checked={desktopConfig.virtualDriveConfig.readOnly}
								onCheckedChange={onReadOnlyChange}
							/>
						</Section>
						<Section
							name={t("mounts.virtualDrive.sections.cache.name")}
							info={t("mounts.virtualDrive.sections.cache.info")}
						>
							{cacheSizeQuery.isSuccess ? (
								<div className="flex flex-row gap-3 items-center">
									<p className="text-muted-foreground text-sm">
										{t("mounts.virtualDrive.cacheUsed", {
											size: formatBytes(cacheSizeQuery.data),
											max: formatBytes(availableCacheSizeQuery.data)
										})}
									</p>
									{cacheSizeQuery.data > 0 && (
										<Button
											onClick={cleanupCache}
											size="sm"
											variant="destructive"
											disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
										>
											{t("mounts.virtualDrive.clear")}
										</Button>
									)}
								</div>
							) : (
								<Loader className="text-muted-foreground animate-spin-medium" />
							)}
						</Section>
						<Section
							name={t("mounts.virtualDrive.sections.cachePath.name")}
							info={t("mounts.virtualDrive.sections.cachePath.info")}
						>
							<div className="flex flex-row gap-1 items-center">
								{desktopConfig.virtualDriveConfig.cachePath && (
									<Input
										value={desktopConfig.virtualDriveConfig.cachePath}
										type="text"
										onChange={e => {
											e.preventDefault()
											e.target.blur()
										}}
										className="min-w-[250px]"
										autoCapitalize="none"
										autoComplete="none"
										autoCorrect="none"
										disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
									/>
								)}
								<Button
									size="sm"
									onClick={changeCachePath}
									disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
								>
									<Edit size={18} />
								</Button>
							</div>
						</Section>
						<Section
							name={t("mounts.virtualDrive.sections.cacheSize.name")}
							info={t("mounts.virtualDrive.sections.cacheSize.info")}
						>
							<Select
								onValueChange={onCacheChange}
								value={desktopConfig.virtualDriveConfig.cacheSizeInGi.toString()}
								disabled={enablingVirtualDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
							>
								<SelectTrigger className="min-w-[120px]">
									<SelectValue placeholder={`${desktopConfig.virtualDriveConfig.cacheSizeInGi} GB`} />
								</SelectTrigger>
								<SelectContent className="max-h-[200px]">
									{cacheSteps.map(size => {
										return (
											<SelectItem
												key={size}
												value={size.toString()}
											>
												{size} GB
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</Section>
						{!enablingVirtualDrive && isMountedQuery.data.mounted && window.desktopAPI.osPlatform() === "win32" && (
							<Section
								name={t("mounts.virtualDrive.sections.browse.name")}
								info={t("mounts.virtualDrive.sections.browse.info")}
								className="mt-10"
							>
								<Button
									onClick={browse}
									size="sm"
								>
									{t("mounts.virtualDrive.browse")}
								</Button>
							</Section>
						)}
						<div className="w-full h-12" />
					</div>
				</div>
			</div>
			<Transfers />
		</div>
	)
})

export default VirtualDrive
