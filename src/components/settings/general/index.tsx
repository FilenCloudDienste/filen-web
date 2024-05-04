import { memo, useCallback } from "react"
import { Progress } from "@/components/ui/progress"
import useAccount from "@/hooks/useAccount"
import { formatBytes } from "@/utils"
import { useTranslation } from "react-i18next"
import Avatar from "@/components/avatar"
import Section from "../section"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme, type Theme } from "@/providers/themeProvider"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { transfer } from "comlink"
import { showSaveFilePicker } from "native-file-system-adapter"
import { useNavigate } from "@tanstack/react-router"
import { clear as clearLocalForage } from "@/lib/localForage"
import sdk from "@/lib/sdk"

export const General = memo(() => {
	const account = useAccount()
	const { t } = useTranslation()
	const theme = useTheme()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const navigate = useNavigate()

	const onThemeChange = useCallback(
		(t: Theme) => {
			theme.setTheme(t)
		},
		[theme]
	)

	const uploadAvatar = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files || e.target.files.length !== 1 || !account) {
				return
			}

			const toast = loadingToast()

			try {
				const file = e.target.files[0]
				const buffer = Buffer.from(await file.arrayBuffer())

				await worker.uploadAvatar({ buffer: transfer(buffer, [buffer.buffer]) })
				await account.refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()

				const input = document.getElementById("avatar-input") as HTMLInputElement

				input.value = ""
			}
		},
		[loadingToast, errorToast, account]
	)

	const requestAccountData = useCallback(async () => {
		if (!account) {
			return
		}

		try {
			const fileHandle = await showSaveFilePicker({
				suggestedName: `${account.account.email}.data.json`
			})
			const writer = await fileHandle.createWritable()

			const toast = loadingToast()

			try {
				const gdpr = await worker.requestAccountData()

				await writer.write(JSON.stringify(gdpr, null, 4))
				await writer.close()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			const input = document.getElementById("avatar-input") as HTMLInputElement

			input.value = ""
		}
	}, [loadingToast, errorToast, account])

	const logout = useCallback(async () => {
		const toast = loadingToast()

		try {
			window.localStorage.clear()
			sdk.init({})

			await Promise.all([clearLocalForage(), worker.deinitializeSDK()])

			navigate({
				to: "/login",
				replace: true,
				resetScroll: true
			})
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, navigate])

	if (!account) {
		return null
	}

	return (
		<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
			<input
				className="hidden"
				id="avatar-input"
				onChange={uploadAvatar}
				type="file"
				accept="image/png, image/jpeg, image/jpg"
			/>
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
									size: formatBytes(account.account.storage - account.settings.versionedStorage)
								})}
							</p>
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-4 mt-10">
					<Section name="Avatar">
						<Avatar
							src={account.account.avatarURL}
							size={32}
						/>
						<p
							className="underline cursor-pointer"
							onClick={() => document.getElementById("avatar-input")?.click()}
						>
							Edit
						</p>
					</Section>
					<Section name="Email address">
						<p className="text-muted-foreground">{account.account.email}</p>
						<p className="underline cursor-pointer">Edit</p>
					</Section>
					<Section name="Personal information">
						<p className="underline cursor-pointer">Edit</p>
					</Section>
					<Section
						name="Theme"
						className="mt-10"
					>
						<Select onValueChange={onThemeChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={theme.theme} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="dark">Dark</SelectItem>
								<SelectItem value="system">System</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section name="Language">
						<Select onValueChange={onThemeChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={theme.theme} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="dark">Dark</SelectItem>
								<SelectItem value="system">System</SelectItem>
							</SelectContent>
						</Select>
					</Section>
					<Section
						name="Request account data"
						className="mt-10"
					>
						<p
							className="underline cursor-pointer"
							onClick={requestAccountData}
						>
							Request
						</p>
					</Section>
					<Section name="Logout">
						<p
							className="underline cursor-pointer text-red-500"
							onClick={logout}
						>
							Logout
						</p>
					</Section>
				</div>
			</div>
		</div>
	)
})

export default General
