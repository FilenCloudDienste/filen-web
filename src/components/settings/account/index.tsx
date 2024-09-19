import { memo, useCallback, useState, useEffect, useRef } from "react"
import useAccount from "@/hooks/useAccount"
import Section from "../section"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { showSaveFilePicker } from "native-file-system-adapter"
import { Switch } from "@/components/ui/switch"
import { formatBytes } from "@/utils"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showTwoFactorCodeDialog } from "@/components/dialogs/twoFactorCode"
import { transfer } from "comlink"
import Avatar from "@/components/avatar"
import { showInputDialog } from "@/components/dialogs/input"
import ChangeEmailDialog from "./dialogs/changeEmail"
import eventEmitter from "@/lib/eventEmitter"
import ChangePersonalInformationDialog from "./dialogs/personalInformation"
import Skeletons from "../skeletons"
import { useTranslation } from "react-i18next"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import { sanitizeFileName } from "@/lib/utils"

export const nickNameRegex: RegExp = /^(?! )[A-Za-z0-9 _-]{3,32}(?<! )$/

export const Account = memo(() => {
	const account = useAccount()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const [usage, setUsage] = useState<{ all: number; versioned: number }>(
		account
			? {
					all: account.account.storage,
					versioned: account.settings.versionedStorage
				}
			: {
					all: 0,
					versioned: 0
				}
	)
	const lastUsageRef = useRef<number>(-1)
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()

	const requestAccountData = useCallback(async () => {
		if (!account) {
			return
		}

		try {
			const fileHandle = await showSaveFilePicker({
				suggestedName: `${sanitizeFileName(account.account.email)}.data.json`
			})
			const writer = await fileHandle.createWritable()

			const toast = loadingToast()

			try {
				const gdpr = await worker.requestAccountData()

				await writer.write(JSON.stringify(gdpr, null, 4))
				await writer.close()
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			} finally {
				toast.dismiss()
			}
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			}
		} finally {
			const input = document.getElementById("avatar-input") as HTMLInputElement

			input.value = ""
		}
	}, [loadingToast, errorToast, account])

	const deleteVersioned = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: t("settings.dialogs.deleteVersions.title"),
				continueButtonText: t("settings.dialogs.deleteVersions.continue"),
				description: t("settings.dialogs.deleteVersions.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.deleteAllVersionedFiles()

			setUsage(prev => ({
				...prev,
				versioned: 0
			}))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, t])

	const deleteAll = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: t("settings.dialogs.deleteAll.title"),
				continueButtonText: t("settings.dialogs.deleteAll.continue"),
				description: t("settings.dialogs.deleteAll.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("settings.dialogs.deleteAll2.title"),
				continueButtonText: t("settings.dialogs.deleteAll2.continue"),
				description: t("settings.dialogs.deleteAll2.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("settings.dialogs.deleteAll3.title"),
				continueButtonText: t("settings.dialogs.deleteAll3.continue"),
				description: t("settings.dialogs.deleteAll3.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.deleteEverything()

			setUsage({
				all: 0,
				versioned: 0
			})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, t])

	const onVersioningChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.toggleFileVersioning({ enabled: checked })
				await account.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account]
	)

	const onLoginAlertsChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.toggleLoginAlerts({ enabled: checked })
				await account.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account]
	)

	const onAppearOfflineChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.appearOffline({ enabled: checked })
				await account.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account]
	)

	const requestAccountDeletion = useCallback(async () => {
		if (!account) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("settings.dialogs.requestAccountDeletion.title"),
				continueButtonText: t("settings.dialogs.requestAccountDeletion.continue"),
				description: t("settings.dialogs.requestAccountDeletion.description"),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		let twoFactorCode: string | undefined = undefined

		if (account.settings.twoFactorEnabled) {
			const code = await showTwoFactorCodeDialog({
				title: t("dialogs.twoFactorCode.title"),
				continueButtonText: t("dialogs.twoFactorCode.continue"),
				description: t("dialogs.twoFactorCode.info"),
				continueButtonVariant: "default"
			})

			if (code.cancelled) {
				twoFactorCode = ""
			} else {
				twoFactorCode = code.code
			}
		}

		const toast = loadingToast()

		try {
			await worker.requestAccountDeletion(twoFactorCode ? { twoFactorCode } : {})
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, account, t])

	const uploadAvatar = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files || e.target.files.length !== 1 || !account) {
				return
			}

			const file = e.target.files[0]

			if (!file) {
				return
			}

			if (file.size >= 1024 * 1024 * 2) {
				errorToast(t("settings.account.sections.avatar.invalid"))

				return
			}

			const toast = loadingToast()

			try {
				const arrayBuffer = await file.arrayBuffer()

				await worker.uploadAvatar({ arrayBuffer: transfer(arrayBuffer, [arrayBuffer]) })
				await account.refetch()
			} catch (e) {
				if (e instanceof Error && e.message.toLowerCase().includes("maximum storage reached")) {
					eventEmitter.emit("openStorageDialog")

					return
				}

				if (e instanceof Error && !e.message.toLowerCase().includes("abort")) {
					console.error(e)

					//errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
					errorToast(t("settings.account.sections.avatar.invalid"))
				}
			} finally {
				toast.dismiss()

				const input = document.getElementById("avatar-input") as HTMLInputElement

				input.value = ""
			}
		},
		[loadingToast, errorToast, account, t]
	)

	const changeNickname = useCallback(async () => {
		if (!account) {
			return
		}

		const inputResponse = await showInputDialog({
			title: t("settings.dialogs.nickName.title"),
			continueButtonText: t("settings.dialogs.nickName.continue"),
			value: account.account.nickName,
			autoFocusInput: true,
			placeholder: t("settings.dialogs.nickName.placeholder"),
			continueButtonVariant: "default",
			allowEmptyValue: true,
			minLength: 0,
			maxLength: 32
		})

		if (inputResponse.cancelled) {
			return
		}

		if (inputResponse.value.trim().length > 0 && !nickNameRegex.test(inputResponse.value.trim())) {
			errorToast(t("settings.dialogs.nickName.invalid"))

			return
		}

		const toast = loadingToast()

		try {
			await worker.changeNickname({ nickname: inputResponse.value.trim() })
			await account.refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, account, t])

	const changeEmail = useCallback(() => {
		eventEmitter.emit("openChangeEmailDialog")
	}, [])

	const changePersonalInformation = useCallback(() => {
		eventEmitter.emit("openChangePersonalInformationDialog")
	}, [])

	useEffect(() => {
		if (account && lastUsageRef.current !== account.account.storage + account.settings.versionedStorage) {
			lastUsageRef.current = account.account.storage + account.settings.versionedStorage

			setUsage({
				all: account.account.storage,
				versioned: account.settings.versionedStorage
			})
		}
	}, [account])

	if (!account) {
		return <Skeletons />
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
						<Section
							name={t("settings.account.sections.avatar.name")}
							info={t("settings.account.sections.avatar.info")}
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "drag"
							}}
						>
							<Avatar
								src={account.account.avatarURL}
								size={32}
							/>
							<p
								className="underline cursor-pointer"
								onClick={() => document.getElementById("avatar-input")?.click()}
							>
								{t("settings.account.sections.avatar.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.versionedFiles.name")}
							info={t("settings.account.sections.versionedFiles.info")}
							className="mt-10"
						>
							<p className="text-muted-foreground">{formatBytes(usage.versioned)}</p>
							<p
								className="underline cursor-pointer text-red-500"
								onClick={deleteVersioned}
							>
								{t("settings.account.sections.versionedFiles.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.all.name")}
							info={t("settings.account.sections.all.info")}
						>
							<p className="text-muted-foreground">{formatBytes(usage.all)}</p>
							<p
								className="underline cursor-pointer text-red-500"
								onClick={deleteAll}
							>
								{t("settings.account.sections.all.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.email.name")}
							info={t("settings.account.sections.email.info")}
							className="mt-10"
						>
							<p className="text-muted-foreground">{account.account.email}</p>
							<p
								className="underline cursor-pointer"
								onClick={changeEmail}
							>
								{t("settings.account.sections.email.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.nickName.name")}
							info={t("settings.account.sections.nickName.info")}
						>
							{account.account.nickName.length > 0 && <p className="text-muted-foreground">{account.account.nickName}</p>}
							<p
								className="underline cursor-pointer"
								onClick={changeNickname}
							>
								{t("settings.account.sections.nickName.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.personalInformation.name")}
							info={t("settings.account.sections.personalInformation.info")}
						>
							<p
								className="underline cursor-pointer"
								onClick={changePersonalInformation}
							>
								{t("settings.account.sections.personalInformation.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.fileVersioning.name")}
							info={t("settings.account.sections.fileVersioning.info")}
							className="mt-10"
						>
							<Switch
								checked={account.settings.versioningEnabled}
								onCheckedChange={onVersioningChange}
							/>
						</Section>
						<Section
							name={t("settings.account.sections.loginAlerts.name")}
							info={t("settings.account.sections.loginAlerts.info")}
						>
							<Switch
								checked={account.settings.loginAlertsEnabled}
								onCheckedChange={onLoginAlertsChange}
							/>
						</Section>
						<Section
							name={t("settings.account.sections.appearOffline.name")}
							info={t("settings.account.sections.appearOffline.info")}
						>
							<Switch
								checked={account.account.appearOffline}
								onCheckedChange={onAppearOfflineChange}
							/>
						</Section>
						<Section
							name={t("settings.account.sections.requestAccountData.name")}
							info={t("settings.account.sections.requestAccountData.info")}
							className="mt-10"
						>
							<p
								className="underline cursor-pointer"
								onClick={requestAccountData}
							>
								{t("settings.account.sections.requestAccountData.action")}
							</p>
						</Section>
						<Section
							name={t("settings.account.sections.requestAccountDeletion.name")}
							info={t("settings.account.sections.requestAccountDeletion.info")}
							className="mt-10"
						>
							<p
								className="underline cursor-pointer text-red-500"
								onClick={requestAccountDeletion}
							>
								{t("settings.account.sections.requestAccountDeletion.action")}
							</p>
						</Section>
						<div className="w-full h-20" />
					</div>
				</div>
			</div>
			<input
				className="hidden"
				id="avatar-input"
				onChange={uploadAvatar}
				type="file"
				accept="image/png, image/jpeg, image/jpg"
			/>
			<ChangeEmailDialog />
			<ChangePersonalInformationDialog account={account.account} />
		</>
	)
})

export default Account
