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
import { DESKTOP_TOPBAR_HEIGHT } from "@/constants"

export async function isNetworkDriveMounted(): Promise<{ mounted: boolean }> {
	const [mounted, active] = await Promise.all([window.desktopAPI.isNetworkDriveMounted(), window.desktopAPI.isNetworkDriveActive()])

	return {
		mounted: mounted && active
	}
}

export async function areDependenciesInstalled(): Promise<{ installed: boolean }> {
	/*if (window.desktopAPI.osPlatform() === "win32") {
		return {
			installed: await window.desktopAPI.isWinFSPInstalled()
		}
	}*/

	if (window.desktopAPI.osPlatform() === "linux") {
		return {
			installed: await window.desktopAPI.isFUSE3InstalledOnLinux()
		}
	}

	/*if (window.desktopAPI.osPlatform() === "darwin") {
		return {
			installed: await window.desktopAPI.isFUSETInstalledOnMacOS()
		}
	}*/

	return {
		installed: true
	}
}

export const NetworkDrive = memo(() => {
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()
	const { enablingNetworkDrive, setEnablingNetworkDrive } = useMountsStore(
		useCallback(
			state => ({
				enablingNetworkDrive: state.enablingNetworkDrive,
				setEnablingNetworkDrive: state.setEnablingNetworkDrive
			}),
			[]
		)
	)
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const errorToast = useErrorToast()

	const isMountedQuery = useQuery({
		queryKey: ["isNetworkDriveMounted"],
		queryFn: () => isNetworkDriveMounted()
	})

	const availableDrivesQuery = useQuery({
		queryKey: ["getAvailableDrives"],
		queryFn: () => (window.desktopAPI.osPlatform() === "win32" ? window.desktopAPI.getAvailableDrives() : Promise.resolve([]))
	})

	const cacheSizeQuery = useQuery({
		queryKey: ["networkDriveCacheSize"],
		queryFn: () => window.desktopAPI.networkDriveCacheSize()
	})

	const availableCacheSizeQuery = useQuery({
		queryKey: ["networkDriveAvailableCache"],
		queryFn: () => window.desktopAPI.networkDriveAvailableCache()
	})

	const dependenciesQuery = useQuery({
		queryKey: ["networkDriveDependencies"],
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
			...availableDrivesQuery.data.filter(letter => letter !== desktopConfig.networkDriveConfig.mountPoint),
			desktopConfig.networkDriveConfig.mountPoint
		]
	}, [availableDrivesQuery.isSuccess, availableDrivesQuery.data, desktopConfig.networkDriveConfig.mountPoint])

	const changeMountPoint = useCallback(async () => {
		if (enablingNetworkDrive) {
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

		setEnablingNetworkDrive(true)

		try {
			if (window.desktopAPI.osPlatform() !== "win32" && !(await window.desktopAPI.isUnixMountPointValid(mountPoint))) {
				errorToast(t("mounts.networkDrive.errors.invalidMountPoint"))

				return
			}

			if (window.desktopAPI.osPlatform() !== "win32" && !(await window.desktopAPI.isUnixMountPointEmpty(mountPoint))) {
				errorToast(t("mounts.networkDrive.errors.mountPointNotEmpty"))

				return
			}

			await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch()])

			setDesktopConfig(prev => ({
				...prev,
				networkDriveConfig: {
					...prev.networkDriveConfig,
					mountPoint: mountPoint!
				}
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setDesktopConfig(prev => ({
				...prev,
				networkDriveConfig: {
					...prev.networkDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingNetworkDrive(false)
		}
	}, [enablingNetworkDrive, setEnablingNetworkDrive, errorToast, setDesktopConfig, isMountedQuery, availableDrivesQuery, t])

	const onDriveLetterChange = useCallback(
		async (letter: string) => {
			if (enablingNetworkDrive) {
				return
			}

			setEnablingNetworkDrive(true)

			try {
				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch()])

				setDesktopConfig(prev => ({
					...prev,
					networkDriveConfig: {
						...prev.networkDriveConfig,
						mountPoint: letter
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					networkDriveConfig: {
						...prev.networkDriveConfig,
						enabled: false
					}
				}))
			} finally {
				setEnablingNetworkDrive(false)
			}
		},
		[enablingNetworkDrive, setEnablingNetworkDrive, errorToast, setDesktopConfig, isMountedQuery, availableDrivesQuery]
	)

	const onEnabledChanged = useCallback(
		async (enabled: boolean) => {
			if (enablingNetworkDrive) {
				return
			}

			if (
				!enabled &&
				!(await showConfirmDialog({
					title: t("mounts.networkDrive.dialogs.disable.title"),
					continueButtonText: t("mounts.networkDrive.dialogs.disable.continue"),
					description: t("mounts.networkDrive.dialogs.disable.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			setEnablingNetworkDrive(true)

			try {
				if (enabled) {
					if (
						window.desktopAPI.osPlatform() !== "win32" &&
						!(await window.desktopAPI.doesPathStartWithHomeDir(desktopConfig.networkDriveConfig.mountPoint))
					) {
						errorToast(
							window.desktopAPI.osPlatform() === "linux"
								? t("mounts.networkDrive.errors.pathNotInHomeDir")
								: t("mounts.networkDrive.errors.pathNotInUserDir")
						)

						return
					}

					if (
						window.desktopAPI.osPlatform() !== "win32" &&
						!(await window.desktopAPI.isUnixMountPointValid(desktopConfig.networkDriveConfig.mountPoint))
					) {
						errorToast(t("mounts.networkDrive.errors.invalidMountPoint"))

						return
					}

					if (
						window.desktopAPI.osPlatform() !== "win32" &&
						!(await window.desktopAPI.isUnixMountPointEmpty(desktopConfig.networkDriveConfig.mountPoint))
					) {
						errorToast(t("mounts.networkDrive.errors.mountPointNotEmpty"))

						return
					}

					await window.desktopAPI.restartNetworkDrive()

					if (!(await isNetworkDriveMounted()).mounted) {
						throw new Error("Could not start network drive.")
					}
				} else {
					await window.desktopAPI.stopNetworkDrive()
				}

				await Promise.all([
					isMountedQuery.refetch(),
					availableDrivesQuery.refetch(),
					cacheSizeQuery.refetch(),
					availableCacheSizeQuery.refetch()
				])

				setDesktopConfig(prev => ({
					...prev,
					networkDriveConfig: {
						...prev.networkDriveConfig,
						enabled
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					networkDriveConfig: {
						...prev.networkDriveConfig,
						enabled: false
					}
				}))
			} finally {
				setEnablingNetworkDrive(false)
			}
		},
		[
			setDesktopConfig,
			enablingNetworkDrive,
			setEnablingNetworkDrive,
			errorToast,
			isMountedQuery,
			availableDrivesQuery,
			t,
			desktopConfig.networkDriveConfig.mountPoint,
			cacheSizeQuery,
			availableCacheSizeQuery
		]
	)

	const onCacheChange = useCallback(
		async (size: string) => {
			if (enablingNetworkDrive) {
				return
			}

			setEnablingNetworkDrive(true)

			try {
				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch(), availableCacheSizeQuery.refetch()])

				setDesktopConfig(prev => ({
					...prev,
					networkDriveConfig: {
						...prev.networkDriveConfig,
						cacheSizeInGi: parseInt(size)
					}
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setDesktopConfig(prev => ({
					...prev,
					networkDriveConfig: {
						...prev.networkDriveConfig,
						enabled: false
					}
				}))
			} finally {
				setEnablingNetworkDrive(false)
			}
		},
		[
			enablingNetworkDrive,
			setEnablingNetworkDrive,
			errorToast,
			setDesktopConfig,
			isMountedQuery,
			availableDrivesQuery,
			availableCacheSizeQuery
		]
	)

	const browse = useCallback(async () => {
		if (!desktopConfig.networkDriveConfig.enabled) {
			return
		}

		try {
			if (!(await isNetworkDriveMounted()).mounted) {
				return
			}

			await window.desktopAPI.openLocalPath(
				`${desktopConfig.networkDriveConfig.mountPoint}${window.desktopAPI.osPlatform() === "win32" ? (!desktopConfig.networkDriveConfig.mountPoint.endsWith("\\") ? "\\" : "") : !desktopConfig.networkDriveConfig.mountPoint.endsWith("/") ? "/" : ""}`
			)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [desktopConfig.networkDriveConfig.mountPoint, desktopConfig.networkDriveConfig.enabled, errorToast])

	const cleanupCache = useCallback(async () => {
		if (enablingNetworkDrive) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("mounts.networkDrive.dialogs.cleanupCache.title"),
				continueButtonText: t("mounts.networkDrive.dialogs.cleanupCache.continue"),
				description: t("mounts.networkDrive.dialogs.cleanupCache.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		setEnablingNetworkDrive(true)

		try {
			await window.desktopAPI.networkDriveCleanupCache()

			await Promise.all([cacheSizeQuery.refetch(), isMountedQuery.refetch(), availableDrivesQuery.refetch()])
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setDesktopConfig(prev => ({
				...prev,
				networkDriveConfig: {
					...prev.networkDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingNetworkDrive(false)
		}
	}, [
		errorToast,
		cacheSizeQuery,
		t,
		isMountedQuery,
		availableDrivesQuery,
		enablingNetworkDrive,
		setEnablingNetworkDrive,
		setDesktopConfig
	])

	const openDependenciesInstructions = useCallback(() => {
		if (window.desktopAPI.osPlatform() === "win32") {
			window.open("https://winfsp.dev/rel/", "_blank")
		}

		if (window.desktopAPI.osPlatform() === "linux") {
			window.open("https://launchpad.net/ubuntu/+source/fuse3", "_blank")
		}

		if (window.desktopAPI.osPlatform() === "darwin") {
			window.open("https://www.fuse-t.org/", "_blank")
		}
	}, [])

	const changeCachePath = useCallback(async () => {
		if (enablingNetworkDrive) {
			return
		}

		setEnablingNetworkDrive(true)

		try {
			const path = await window.desktopAPI.selectDirectory(false)

			if (path.cancelled || !path.paths[0]) {
				return
			}

			if (path.paths[0].startsWith(desktopConfig.networkDriveConfig.mountPoint)) {
				errorToast(t("mounts.networkDrive.errors.invalidCachePath"))

				return
			}

			if (!(await window.desktopAPI.isPathReadable(path.paths[0])) || !(await window.desktopAPI.isPathWritable(path.paths[0]))) {
				errorToast(t("mounts.networkDrive.errors.cachePathNotReadableWritable"))

				return
			}

			if (path.paths[0].length > 100) {
				errorToast(t("mounts.networkDrive.errors.invalidCachePathLength"))

				return
			}

			const diskType = await window.desktopAPI.getDiskType(path.paths[0])

			if (diskType && !diskType.isPhysical) {
				errorToast(t("mounts.networkDrive.errors.invalidCachePath"))

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
				networkDriveConfig: {
					...prev.networkDriveConfig,
					cachePath: path.paths[0]!
				}
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setDesktopConfig(prev => ({
				...prev,
				networkDriveConfig: {
					...prev.networkDriveConfig,
					enabled: false
				}
			}))
		} finally {
			setEnablingNetworkDrive(false)
		}
	}, [
		availableCacheSizeQuery,
		availableDrivesQuery,
		enablingNetworkDrive,
		errorToast,
		isMountedQuery,
		setDesktopConfig,
		setEnablingNetworkDrive,
		t,
		cacheSizeQuery,
		desktopConfig.networkDriveConfig.mountPoint
	])

	const onReadOnlyChange = useCallback(
		(readOnly: boolean) => {
			setDesktopConfig(prev => ({
				...prev,
				networkDriveConfig: {
					...prev.networkDriveConfig,
					readOnly
				}
			}))
		},
		[setDesktopConfig]
	)

	useEffect(() => {
		const refetchNetworkDriveListener = eventEmitter.on("refetchNetworkDrive", () => {
			isMountedQuery.refetch().catch(console.error)
		})

		return () => {
			refetchNetworkDriveListener.remove()
		}
	}, [isMountedQuery])

	if (!availableDrivesQuery.isSuccess || !availableCacheSizeQuery.isSuccess || !dependenciesQuery.isSuccess) {
		return <Skeletons />
	}

	if (!dependenciesQuery.data.installed) {
		return (
			<div className="flex flex-col items-center justify-center overflow-hidden h-[calc(100dvh-48px)]">
				<p>{t("mounts.networkDrive.missingDeps")}</p>
				<p className="text-muted-foreground text-sm">
					{window.desktopAPI.osPlatform() === "win32"
						? t("mounts.networkDrive.missingDepsWindows")
						: t("mounts.networkDrive.missingDepsLinux")}
				</p>
				<Button
					className="mt-4 gap-2 items-center"
					size="sm"
					onClick={openDependenciesInstructions}
				>
					<ArrowRight size={16} />
					{t("mounts.networkDrive.missingDepsInstructions")}
				</Button>
			</div>
		)
	}

	return (
		<div className="flex flex-col w-full h-[100dvh] overflow-hidden">
			<div
				className="overflow-x-hidden overflow-y-auto"
				style={{
					height: "calc(100dvh - " + (DESKTOP_TOPBAR_HEIGHT + 40 + 17) + "px)"
				}}
			>
				<div
					className="flex flex-col p-6 h-full"
					style={{
						width: settingsContainerSize.width
					}}
				>
					<div className="flex flex-col gap-4">
						<Section
							name={t("mounts.networkDrive.sections.active.name")}
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "drag"
							}}
						>
							{enablingNetworkDrive || !isMountedQuery.isSuccess ? (
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
									? t("mounts.networkDrive.description")
									: t("mounts.networkDrive.unixDescription")}
							</p>
							<p className="text-muted-foreground text-sm">{t("mounts.networkDrive.limitations")}</p>
							<p className="text-muted-foreground text-sm">{t("mounts.networkDrive.sudo")}</p>
						</div>
						<Section
							name={t("mounts.networkDrive.sections.enabled.name")}
							info={t("mounts.networkDrive.sections.enabled.info")}
							className="mt-10"
						>
							<Switch
								disabled={enablingNetworkDrive}
								checked={isMountedQuery.isSuccess && isMountedQuery.data.mounted}
								onCheckedChange={onEnabledChanged}
							/>
						</Section>
						{window.desktopAPI.osPlatform() === "win32" ? (
							<Section
								name={t("mounts.networkDrive.sections.driveLetter.name")}
								info={t("mounts.networkDrive.sections.driveLetter.info")}
							>
								<Select
									onValueChange={onDriveLetterChange}
									value={desktopConfig.networkDriveConfig.mountPoint}
									disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
								>
									<SelectTrigger className="min-w-[120px]">
										<SelectValue placeholder={desktopConfig.networkDriveConfig.mountPoint} />
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
								name={t("mounts.networkDrive.sections.mountPoint.name")}
								info={t("mounts.networkDrive.sections.mountPoint.info")}
							>
								<div className="flex flex-row gap-1 items-center">
									<Input
										value={desktopConfig.networkDriveConfig.mountPoint}
										type="text"
										onChange={e => {
											e.preventDefault()
											e.target.blur()
										}}
										className="min-w-[250px]"
										autoCapitalize="none"
										autoComplete="none"
										autoCorrect="none"
										disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
									/>
									<Button
										size="sm"
										onClick={changeMountPoint}
										disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
									>
										<Edit size={18} />
									</Button>
								</div>
							</Section>
						)}
						<Section
							name={t("mounts.networkDrive.sections.readOnly.name")}
							info={t("mounts.networkDrive.sections.readOnly.info")}
						>
							<Switch
								disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
								checked={desktopConfig.networkDriveConfig.readOnly}
								onCheckedChange={onReadOnlyChange}
							/>
						</Section>
						<Section
							name={t("mounts.networkDrive.sections.cache.name")}
							info={t("mounts.networkDrive.sections.cache.info")}
						>
							{cacheSizeQuery.isSuccess ? (
								<div className="flex flex-row gap-3 items-center">
									<p className="text-muted-foreground text-sm">
										{t("mounts.networkDrive.cacheUsed", {
											size: formatBytes(cacheSizeQuery.data),
											max: formatBytes(availableCacheSizeQuery.data)
										})}
									</p>
									{cacheSizeQuery.data > 0 && (
										<Button
											onClick={cleanupCache}
											size="sm"
											variant="destructive"
											disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
										>
											{t("mounts.networkDrive.clear")}
										</Button>
									)}
								</div>
							) : (
								<Loader className="text-muted-foreground animate-spin-medium" />
							)}
						</Section>
						<Section
							name={t("mounts.networkDrive.sections.cachePath.name")}
							info={t("mounts.networkDrive.sections.cachePath.info")}
						>
							<div className="flex flex-row gap-1 items-center">
								{desktopConfig.networkDriveConfig.cachePath && (
									<Input
										value={desktopConfig.networkDriveConfig.cachePath}
										type="text"
										onChange={e => {
											e.preventDefault()
											e.target.blur()
										}}
										className="min-w-[250px]"
										autoCapitalize="none"
										autoComplete="none"
										autoCorrect="none"
										disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
									/>
								)}
								<Button
									size="sm"
									onClick={changeCachePath}
									disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
								>
									<Edit size={18} />
								</Button>
							</div>
						</Section>
						<Section
							name={t("mounts.networkDrive.sections.cacheSize.name")}
							info={t("mounts.networkDrive.sections.cacheSize.info")}
						>
							<Select
								onValueChange={onCacheChange}
								value={desktopConfig.networkDriveConfig.cacheSizeInGi.toString()}
								disabled={enablingNetworkDrive || (isMountedQuery.isSuccess && isMountedQuery.data.mounted)}
							>
								<SelectTrigger className="min-w-[120px]">
									<SelectValue placeholder={`${desktopConfig.networkDriveConfig.cacheSizeInGi} GB`} />
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
						{!enablingNetworkDrive && isMountedQuery.isSuccess && isMountedQuery.data.mounted && (
							<Section
								name={t("mounts.networkDrive.sections.browse.name")}
								info={t("mounts.networkDrive.sections.browse.info")}
								className="mt-10"
							>
								<Button
									onClick={browse}
									size="sm"
								>
									{t("mounts.networkDrive.browse")}
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

export default NetworkDrive
