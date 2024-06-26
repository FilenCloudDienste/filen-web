import { memo, useCallback, useState, useEffect, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Section from "@/components/settings/section"
import { useTranslation } from "react-i18next"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import { CheckCircle, XCircle, Loader } from "lucide-react"
import { useVirtualDriveStore } from "@/stores/mounts.store"
import useDesktopConfig from "@/hooks/useDesktopConfig"
import useErrorToast from "@/hooks/useErrorToast"
import { type FilenDesktopConfig } from "@filen/desktop/dist/types"
import { useQuery } from "@tanstack/react-query"
import eventEmitter from "@/lib/eventEmitter"
import Skeletons from "@/components/settings/skeletons"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/utils"
import useLoadingToast from "@/hooks/useLoadingToast"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { generateCacheSteps } from "./utils"

export const VirtualDrive = memo(() => {
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()
	const [virtualDriveStore, setVirtualDriveStore] = useVirtualDriveStore()
	const [enabling, setEnabling] = useState<boolean>(false)
	const [desktopConfig, setDesktopConfig] = useDesktopConfig()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const isMountedQuery = useQuery({
		queryKey: ["isVirtualDriveMounted"],
		queryFn: () =>
			new Promise<{ mounted: boolean }>((resolve, reject) => {
				window.desktopAPI
					.isVirtualDriveMounted()
					.then(mounted => {
						resolve({
							mounted
						})
					})
					.catch(reject)
			}),
		refetchInterval: 1000,
		refetchIntervalInBackground: true
	})

	const availableDrivesQuery = useQuery({
		queryKey: ["getAvailableDrives"],
		queryFn: () => window.desktopAPI.getAvailableDrives(),
		refetchInterval: 5000,
		refetchIntervalInBackground: true
	})

	const cacheSizeQuery = useQuery({
		queryKey: ["virtualDriveCacheSize"],
		queryFn: () => window.desktopAPI.virtualDriveCacheSize()
	})

	const availableCacheSizeQuery = useQuery({
		queryKey: ["virtualDriveAvailableCache"],
		queryFn: () => window.desktopAPI.virtualDriveAvailableCache()
	})

	const cacheSteps = useMemo(() => {
		if (!availableCacheSizeQuery.isSuccess) {
			return [10]
		}

		return generateCacheSteps(Math.floor(availableCacheSizeQuery.data / (1024 * 1024 * 1024)))
	}, [availableCacheSizeQuery.isSuccess, availableCacheSizeQuery.data])

	const availableDrives = useMemo(() => {
		if (!availableDrivesQuery.isSuccess) {
			return []
		}

		return [
			...availableDrivesQuery.data.filter(letter => letter !== desktopConfig.virtualDriveConfig.mountPoint),
			desktopConfig.virtualDriveConfig.mountPoint
		]
	}, [availableDrivesQuery.isSuccess, availableDrivesQuery.data, desktopConfig.virtualDriveConfig.mountPoint])

	const onValueChange = useCallback(
		async (letter: string) => {
			if (enabling) {
				return
			}

			setEnabling(true)

			try {
				const newConfig: FilenDesktopConfig = {
					...desktopConfig,
					virtualDriveConfig: {
						...desktopConfig.virtualDriveConfig,
						mountPoint: letter
					}
				}

				await window.desktopAPI.setConfig(newConfig)

				if (virtualDriveStore.enabled) {
					await window.desktopAPI.restartVirtualDrive()

					if (!(await window.desktopAPI.isVirtualDriveMounted())) {
						throw new Error("Could not start virtual drive.")
					}
				}

				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch()])

				setDesktopConfig(newConfig)
				setVirtualDriveStore(prev => ({
					...prev,
					driveLetter: letter
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setVirtualDriveStore(prev => ({
					...prev,
					enabled: false
				}))
			} finally {
				setEnabling(false)
			}
		},
		[
			setVirtualDriveStore,
			enabling,
			errorToast,
			desktopConfig,
			setDesktopConfig,
			isMountedQuery,
			availableDrivesQuery,
			virtualDriveStore.enabled
		]
	)

	const onCheckedChange = useCallback(
		async (checked: boolean) => {
			if (enabling) {
				return
			}

			if (
				!checked &&
				!(await showConfirmDialog({
					title: t("mounts.virtualDrive.dialogs.disable.title"),
					continueButtonText: t("mounts.virtualDrive.dialogs.disable.continue"),
					description: t("mounts.virtualDrive.dialogs.disable.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			setEnabling(true)

			try {
				const newConfig: FilenDesktopConfig = {
					...desktopConfig,
					virtualDriveConfig: {
						...desktopConfig.virtualDriveConfig,
						mountPoint: virtualDriveStore.driveLetter
					}
				}

				await window.desktopAPI.setConfig(newConfig)

				if (checked) {
					await window.desktopAPI.restartVirtualDrive()

					if (!(await window.desktopAPI.isVirtualDriveMounted())) {
						throw new Error("Could not start virtual drive.")
					}
				} else {
					await window.desktopAPI.stopVirtualDrive()
				}

				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch()])

				setDesktopConfig(newConfig)
				setVirtualDriveStore(prev => ({
					...prev,
					enabled: checked
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setVirtualDriveStore(prev => ({
					...prev,
					enabled: false
				}))
			} finally {
				setEnabling(false)
			}
		},
		[
			setVirtualDriveStore,
			enabling,
			errorToast,
			virtualDriveStore.driveLetter,
			desktopConfig,
			setDesktopConfig,
			isMountedQuery,
			availableDrivesQuery,
			t
		]
	)

	const onCacheChange = useCallback(
		async (size: string) => {
			if (enabling) {
				return
			}

			setEnabling(true)

			try {
				const newConfig: FilenDesktopConfig = {
					...desktopConfig,
					virtualDriveConfig: {
						...desktopConfig.virtualDriveConfig,
						cacheSizeInGi: parseInt(size)
					}
				}

				await window.desktopAPI.setConfig(newConfig)

				if (virtualDriveStore.enabled) {
					await window.desktopAPI.restartVirtualDrive()

					if (!(await window.desktopAPI.isVirtualDriveMounted())) {
						throw new Error("Could not start virtual drive.")
					}
				}

				await Promise.all([isMountedQuery.refetch(), availableDrivesQuery.refetch(), availableCacheSizeQuery.refetch()])

				setDesktopConfig(newConfig)
				setVirtualDriveStore(prev => ({
					...prev,
					cacheSizeInGi: parseInt(size)
				}))
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				setVirtualDriveStore(prev => ({
					...prev,
					enabled: false
				}))
			} finally {
				setEnabling(false)
			}
		},
		[
			setVirtualDriveStore,
			enabling,
			errorToast,
			virtualDriveStore.enabled,
			desktopConfig,
			setDesktopConfig,
			isMountedQuery,
			availableDrivesQuery,
			availableCacheSizeQuery
		]
	)

	const browse = useCallback(async () => {
		if (!virtualDriveStore.enabled) {
			return
		}

		try {
			if (!(await window.desktopAPI.isVirtualDriveMounted())) {
				return
			}

			await window.desktopAPI.openLocalPath(`${virtualDriveStore.driveLetter}\\`)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [virtualDriveStore.driveLetter, virtualDriveStore.enabled, errorToast])

	const cleanupCache = useCallback(async () => {
		if (enabling) {
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

		setEnabling(true)

		const toast = loadingToast()

		try {
			const isActive = (await window.desktopAPI.isVirtualDriveMounted()) && virtualDriveStore.enabled

			await window.desktopAPI.stopVirtualDrive()
			await window.desktopAPI.virtualDriveCleanupCache()

			if (isActive) {
				await window.desktopAPI.restartVirtualDrive()
			}

			await Promise.all([cacheSizeQuery.refetch(), isMountedQuery.refetch(), availableDrivesQuery.refetch()])
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			setVirtualDriveStore(prev => ({
				...prev,
				enabled: false
			}))
		} finally {
			toast.dismiss()

			setEnabling(false)
		}
	}, [
		loadingToast,
		errorToast,
		cacheSizeQuery,
		t,
		isMountedQuery,
		availableDrivesQuery,
		virtualDriveStore.enabled,
		enabling,
		setVirtualDriveStore
	])

	useEffect(() => {
		const refetchVirtualDriveListener = eventEmitter.on("refetchVirtualDrive", () => {
			isMountedQuery.refetch().catch(console.error)
		})

		return () => {
			refetchVirtualDriveListener.remove()
		}
	}, [isMountedQuery])

	if (!isMountedQuery.data || !availableDrivesQuery.isSuccess || !availableCacheSizeQuery.isSuccess) {
		return <Skeletons />
	}

	return (
		<div className="flex flex-col w-full h-[100dvh] overflow-y-auto overflow-x-hidden">
			<div
				className="flex flex-col p-6 h-full gap-4"
				style={{
					width: settingsContainerSize.width
				}}
			>
				<Section name={t("mounts.virtualDrive.sections.active.name")}>
					{enabling ? (
						<Loader className="animate-spin-medium" />
					) : isMountedQuery.data.mounted ? (
						<div className="flex flex-row gap-3">
							<CheckCircle className="text-green-500" />
						</div>
					) : (
						<XCircle className="text-red-500" />
					)}
				</Section>
				<Section
					name={t("mounts.virtualDrive.sections.enabled.name")}
					info={t("mounts.virtualDrive.sections.enabled.info")}
					className="mt-10"
				>
					<Switch
						disabled={enabling}
						checked={virtualDriveStore.enabled && isMountedQuery.isSuccess && isMountedQuery.data.mounted}
						onCheckedChange={onCheckedChange}
					/>
				</Section>
				<Section
					name={t("mounts.virtualDrive.sections.driveLetter.name")}
					info={t("mounts.virtualDrive.sections.driveLetter.info")}
				>
					<Select
						onValueChange={onValueChange}
						value={desktopConfig.virtualDriveConfig.mountPoint}
					>
						<SelectTrigger className="min-w-[120px]">
							<SelectValue placeholder={desktopConfig.virtualDriveConfig.mountPoint} />
						</SelectTrigger>
						<SelectContent>
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
					name={t("mounts.virtualDrive.sections.cacheSize.name")}
					info={t("mounts.virtualDrive.sections.cacheSize.info")}
				>
					<Select
						onValueChange={onCacheChange}
						value={virtualDriveStore.cacheSizeInGi.toString()}
					>
						<SelectTrigger className="min-w-[120px]">
							<SelectValue placeholder={`${virtualDriveStore.cacheSizeInGi} GB`} />
						</SelectTrigger>
						<SelectContent>
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
				{!enabling && isMountedQuery.data.mounted && (
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
			</div>
		</div>
	)
})

export default VirtualDrive
