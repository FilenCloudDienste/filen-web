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
import { clear as clearLocalForage } from "@/lib/localForage"
import sdk from "@/lib/sdk"
import { IS_DESKTOP } from "@/constants"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { Switch } from "@/components/ui/switch"
import { useLocalStorage } from "@uidotdev/usehooks"
import { type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { useQuery } from "@tanstack/react-query"

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

	const thumbnailCacheQuery = useQuery({
		queryKey: ["workerCalculateThumbnailCacheUsage"],
		queryFn: () => worker.workerCalculateThumbnailCacheUsage()
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

	const logout = useCallback(
		async (e: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => {
			if (!e.shiftKey) {
				if (
					!(await showConfirmDialog({
						title: "d",
						continueButtonText: "ddd",
						description: "ookeoetrasher",
						continueButtonVariant: "destructive"
					}))
				) {
					return
				}
			}

			const toast = loadingToast()

			try {
				window.localStorage.clear()
				sdk.init({})

				await Promise.all([clearLocalForage(), worker.deinitializeSDK()])

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

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, navigate]
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
						title: "d",
						continueButtonText: "ddd",
						description: "ookeoetrasher",
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

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, thumbnailCacheQuery]
	)

	if (!account) {
		return null
	}

	return (
		<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
			<div className="flex flex-col p-6 w-5/6 h-full">
				<div className="flex flex-col gap-3 bg-background border p-4 rounded-md">
					<div className="flex flex-row items-center justify-between">
						<p>{t("settings.general.storageUsed")}</p>
						<p>
							{t("settings.general.used", {
								used: formatBytes(account.account.storage),
								max: formatBytes(account.account.maxStorage)
							})}
						</p>
					</div>
					<Progress value={(account.account.storage / account.account.maxStorage) * 100} />
					<div className="flex flex-row items-center gap-6">
						<div className="flex flex-row items-center gap-2">
							<div className="w-4 h-4 rounded-sm bg-primary" />
							<p>
								{t("settings.general.files", {
									size: formatBytes(account.account.storage - account.settings.versionedStorage)
								})}
							</p>
						</div>
						<div className="flex flex-row items-center gap-2">
							<div className="w-4 h-4 rounded-sm bg-primary" />
							<p>
								{t("settings.general.versionedFiles", {
									size: formatBytes(account.settings.versionedStorage)
								})}
							</p>
						</div>
						<div className="flex flex-row items-center gap-2">
							<div className="w-4 h-4 rounded-sm bg-secondary" />
							<p>
								{t("settings.general.free", {
									size: formatBytes(
										account.account.maxStorage - account.account.storage - account.settings.versionedStorage
									)
								})}
							</p>
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-4 mt-10">
					<Section
						name="Default note type"
						info="Change the default note type"
					>
						<Select onValueChange={onDefaultNoteTypeChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={noteTypeToString} />
							</SelectTrigger>
							<SelectContent>
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
							<Section
								name="Chat notifications"
								info="Enable or disable chat notifications"
							>
								<Switch
									checked={chatNotificationsEnabled}
									onCheckedChange={setChatNotificationsEnabled}
								/>
							</Section>
							<Section
								name="Contact notifications"
								info="Enable or disable contact notifications"
							>
								<Switch
									checked={contactNotificationsEnabled}
									onCheckedChange={setContactNotificationsEnabled}
								/>
							</Section>
						</>
					)}
					<Section
						name="Theme"
						info="Change the app appearance"
						className="mt-10"
					>
						<Select onValueChange={onThemeChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={themeToString} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="light">{t("settings.general.light")}</SelectItem>
								<SelectItem value="dark">{t("settings.general.dark")}</SelectItem>
								<SelectItem value="system">{t("settings.general.system")}</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name="Language"
						info="Change the app language"
					>
						<Select onValueChange={onLanguageChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={i18nLangToString} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="en-US">English</SelectItem>
								<SelectItem value="de-DE">Deutsch</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name="Thumbnail cache"
						info="Clear the thumbnail cache"
						className="mt-10"
					>
						<p className="text-muted-foreground">{formatBytes(thumbnailCacheQuery.isSuccess ? thumbnailCacheQuery.data : 0)}</p>
						<p
							className="underline cursor-pointer text-red-500"
							onClick={clearThumbnailCache}
						>
							Clear
						</p>
					</Section>
					<Section
						name="Logout"
						info="Logout"
						className="mt-10"
					>
						<p
							className="underline cursor-pointer text-red-500"
							onClick={logout}
						>
							Logout
						</p>
					</Section>
					<div className="w-full h-20" />
				</div>
			</div>
		</div>
	)
})

export default General
