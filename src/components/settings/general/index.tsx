import { memo, useCallback, useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import useAccount from "@/hooks/useAccount"
import { formatBytes } from "@/utils"
import { useTranslation } from "react-i18next"
import Section from "../section"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme, type Theme } from "@/providers/themeProvider"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { useNavigate } from "@tanstack/react-router"
import { IS_DESKTOP } from "@/constants"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { Switch } from "@/components/ui/switch"
import { useLocalStorage } from "@uidotdev/usehooks"
import { type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { useQuery } from "@tanstack/react-query"
import Skeletons from "../skeletons"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import { logout } from "@/lib/setup"

export const General = memo(() => {
	const account = useAccount()
	const { t, i18n } = useTranslation()
	const theme = useTheme()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const navigate = useNavigate()
	const [chatNotificationsEnabled, setChatNotificationsEnabled] = useLocalStorage<boolean>("chatNotificationsEnabled", false)
	const [contactNotificationsEnabled, setContactNotificationsEnabled] = useLocalStorage<boolean>("contactNotificationsEnabled", false)
	const [defaultNoteType, setDefaultNoteType] = useLocalStorage<NoteType>("defaultNoteType", "text")
	const settingsContainerSize = useSettingsContainerSize()
	const [minimizeToTrayEnabled, setMinimizeToTrayEnabled] = useLocalStorage<boolean>("minimizeToTrayEnabled", false)
	const [notificationSoundEnabled, setNotificationSoundEnabled] = useLocalStorage<boolean>("notificationSoundEnabled", false)

	const thumbnailCacheQuery = useQuery({
		queryKey: ["workerCalculateThumbnailCacheUsage"],
		queryFn: () => worker.workerCalculateThumbnailCacheUsage()
	})

	const versionQuery = useQuery({
		queryKey: ["desktopVersion", IS_DESKTOP],
		queryFn: () => (IS_DESKTOP ? window.desktopAPI.version() : Promise.resolve(""))
	})

	const autoLaunchQuery = useQuery({
		queryKey: ["getAutoLaunch", IS_DESKTOP],
		queryFn: () =>
			IS_DESKTOP && window.desktopAPI.osPlatform() !== "linux" ? window.desktopAPI.getAutoLaunch() : Promise.resolve(null)
	})

	const i18nLangToString = useMemo(() => {
		switch (i18n.language) {
			case "en":
			case "en-US": {
				return "English"
			}

			case "de":
			case "de-DE": {
				return "Deutsch"
			}

			default: {
				return "English"
			}
		}
	}, [i18n])

	const themeToString = useMemo(() => {
		switch (theme.theme) {
			case "dark": {
				return t("settings.general.dark")
			}

			case "light": {
				return t("settings.general.light")
			}

			case "system": {
				return t("settings.general.system")
			}

			default: {
				return t("settings.general.dark")
			}
		}
	}, [theme.theme, t])

	const noteTypeToString = useMemo(() => {
		switch (defaultNoteType) {
			case "text": {
				return t("settings.general.noteType.text")
			}

			case "rich": {
				return t("settings.general.noteType.rich")
			}

			case "checklist": {
				return t("settings.general.noteType.checklist")
			}

			case "md": {
				return t("settings.general.noteType.md")
			}

			case "code": {
				return t("settings.general.noteType.code")
			}

			default: {
				return t("settings.general.noteType.text")
			}
		}
	}, [defaultNoteType, t])

	const onThemeChange = useCallback(
		(t: Theme) => {
			theme.setTheme(t)
		},
		[theme]
	)

	const onDefaultNoteTypeChange = useCallback(
		(type: NoteType) => {
			setDefaultNoteType(type)
		},
		[setDefaultNoteType]
	)

	const logoutFn = useCallback(
		async (e: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => {
			if (!e.shiftKey) {
				if (
					!(await showConfirmDialog({
						title: t("settings.dialogs.logout.title"),
						continueButtonText: t("settings.dialogs.logout.continue"),
						description: t("settings.dialogs.logout.description"),
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			const toast = loadingToast()

			try {
				await logout()

				if (IS_DESKTOP) {
					await window.desktopAPI.restart()
				} else {
					navigate({
						to: "/login",
						replace: true,
						resetScroll: true
					})
				}
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, navigate, t]
	)

	const onLanguageChange = useCallback(
		(lang: string) => {
			i18n.changeLanguage(lang).catch(console.error)
		},
		[i18n]
	)

	const clearThumbnailCache = useCallback(
		async (e: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => {
			if (!e.shiftKey) {
				if (
					!(await showConfirmDialog({
						title: t("settings.dialogs.clearThumbnailCache.title"),
						continueButtonText: t("settings.dialogs.clearThumbnailCache.continue"),
						description: t("settings.dialogs.clearThumbnailCache.description"),
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			const toast = loadingToast()

			try {
				await worker.workerClearThumbnailCache()
				await thumbnailCacheQuery.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, thumbnailCacheQuery, t]
	)

	const toggleAutoLaunch = useCallback(
		async (enabled: boolean) => {
			const toast = loadingToast()

			try {
				await window.desktopAPI.toggleAutoLaunch(enabled)
				await autoLaunchQuery.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, autoLaunchQuery]
	)

	const exportDesktopLogs = useCallback(async () => {
		const toast = loadingToast()

		try {
			await window.desktopAPI.exportLogs()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [errorToast, loadingToast])

	if (!account || !versionQuery.isSuccess) {
		return <Skeletons />
	}

	return (
		<div className="flex flex-col w-full h-[100dvh] overflow-y-auto overflow-x-hidden">
			<div
				className="flex flex-col p-6 h-full"
				style={{
					width: settingsContainerSize.width
				}}
			>
				<div
					className="flex flex-col gap-3 bg-background border p-4 rounded-md"
					style={{
						// @ts-expect-error not typed
						WebkitAppRegion: "drag"
					}}
				>
					<div className="flex flex-row items-center justify-between">
						<p>{t("settings.general.storageUsed")}</p>
						<p>
							{t("settings.general.used", {
								used: formatBytes(account.account.storage),
								max: formatBytes(account.account.maxStorage)
							})}
						</p>
					</div>
					<Progress
						value={
							((account.account.storage >= account.account.maxStorage
								? account.account.maxStorage
								: account.account.storage) /
								account.account.maxStorage) *
							100
						}
						max={100}
					/>
					<div className="flex flex-row items-center gap-6">
						<div className="flex flex-row items-center gap-2">
							<div className="w-4 h-4 rounded-sm bg-primary shrink-0" />
							<p>
								{t("settings.general.files", {
									size: formatBytes(
										(account.account.storage >= account.account.maxStorage
											? account.account.maxStorage
											: account.account.storage) - account.settings.versionedStorage
									)
								})}
							</p>
						</div>
						<div className="flex flex-row items-center gap-2">
							<div className="w-4 h-4 rounded-sm bg-primary shrink-0" />
							<p>
								{t("settings.general.versionedFiles", {
									size: formatBytes(account.settings.versionedStorage)
								})}
							</p>
						</div>
						<div className="flex flex-row items-center gap-2">
							<div className="w-4 h-4 rounded-sm bg-secondary shrink-0" />
							<p>
								{t("settings.general.free", {
									size: formatBytes(
										account.account.maxStorage -
											(account.account.storage >= account.account.maxStorage
												? account.account.maxStorage
												: account.account.storage) -
											account.settings.versionedStorage
									)
								})}
							</p>
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-4 mt-10">
					<Section
						name={t("settings.general.sections.defaultNoteType.name")}
						info={t("settings.general.sections.defaultNoteType.info")}
					>
						<Select onValueChange={onDefaultNoteTypeChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={noteTypeToString} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="text">{t("settings.general.noteType.text")}</SelectItem>
								<SelectItem value="rich">{t("settings.general.noteType.rich")}</SelectItem>
								<SelectItem value="checklist">{t("settings.general.noteType.checklist")}</SelectItem>
								<SelectItem value="md">{t("settings.general.noteType.md")}</SelectItem>
								<SelectItem value="code">{t("settings.general.noteType.code")}</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					{IS_DESKTOP && (
						<>
							{window.desktopAPI.osPlatform() !== "linux" && (
								<>
									<Section
										name={t("settings.general.sections.autoLaunch.name")}
										info={t("settings.general.sections.autoLaunch.info")}
										className="mt-10"
									>
										<Switch
											checked={
												autoLaunchQuery.isSuccess && autoLaunchQuery.data ? autoLaunchQuery.data.openAtLogin : false
											}
											onCheckedChange={toggleAutoLaunch}
										/>
									</Section>
									{window.desktopAPI.osPlatform() !== "darwin" && (
										<Section
											name={t("settings.general.sections.minimizeToTray.name")}
											info={t("settings.general.sections.minimizeToTray.info")}
										>
											<Switch
												checked={minimizeToTrayEnabled}
												onCheckedChange={setMinimizeToTrayEnabled}
											/>
										</Section>
									)}
								</>
							)}
							<Section
								name={t("settings.general.sections.chatNotifications.name")}
								info={t("settings.general.sections.chatNotifications.info")}
								className="mt-10"
							>
								<Switch
									checked={chatNotificationsEnabled}
									onCheckedChange={setChatNotificationsEnabled}
								/>
							</Section>
							<Section
								name={t("settings.general.sections.contactNotifications.name")}
								info={t("settings.general.sections.contactNotifications.info")}
							>
								<Switch
									checked={contactNotificationsEnabled}
									onCheckedChange={setContactNotificationsEnabled}
								/>
							</Section>
							<Section
								name={t("settings.general.sections.notificationSound.name")}
								info={t("settings.general.sections.notificationSound.info")}
							>
								<Switch
									checked={notificationSoundEnabled}
									onCheckedChange={setNotificationSoundEnabled}
								/>
							</Section>
						</>
					)}
					<Section
						name={t("settings.general.sections.theme.name")}
						info={t("settings.general.sections.theme.info")}
						className="mt-10"
					>
						<Select onValueChange={onThemeChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={themeToString} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="light">{t("settings.general.light")}</SelectItem>
								<SelectItem value="dark">{t("settings.general.dark")}</SelectItem>
								<SelectItem value="system">{t("settings.general.system")}</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name={t("settings.general.sections.language.name")}
						info={t("settings.general.sections.language.info")}
					>
						<Select onValueChange={onLanguageChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={i18nLangToString} />
							</SelectTrigger>
							<SelectContent className="max-h-[200px]">
								<SelectItem value="en-US">English</SelectItem>
								<SelectItem value="de-DE">Deutsch</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name={t("settings.general.sections.clearThumbnailCache.name")}
						info={t("settings.general.sections.clearThumbnailCache.info")}
						className="mt-10"
					>
						<p className="text-muted-foreground">{formatBytes(thumbnailCacheQuery.isSuccess ? thumbnailCacheQuery.data : 0)}</p>
						<p
							className="underline cursor-pointer text-red-500"
							onClick={clearThumbnailCache}
						>
							{t("settings.general.sections.clearThumbnailCache.action")}
						</p>
					</Section>
					{IS_DESKTOP && (
						<Section
							name={t("settings.general.sections.exportDesktopLogs.name")}
							info={t("settings.general.sections.exportDesktopLogs.info")}
						>
							<p
								className="underline cursor-pointer"
								onClick={exportDesktopLogs}
							>
								{t("settings.general.sections.exportDesktopLogs.action")}
							</p>
						</Section>
					)}
					<Section
						name={t("settings.general.sections.logout.name")}
						info={t("settings.general.sections.logout.info")}
						className="mt-10"
					>
						<p
							className="underline cursor-pointer text-red-500"
							onClick={logoutFn}
						>
							{t("settings.general.sections.logout.action")}
						</p>
					</Section>
					{IS_DESKTOP && (
						<div className="flex flex-row items-center justify-end">
							<p className="text-muted-foreground text-sm">v{versionQuery.data}</p>
						</div>
					)}
					<div className="w-full h-20" />
				</div>
			</div>
		</div>
	)
})

export default General
