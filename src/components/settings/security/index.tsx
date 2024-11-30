import { memo, useCallback, useMemo } from "react"
import useAccount from "@/hooks/useAccount"
import Section from "../section"
import { Switch } from "@/components/ui/switch"
import { showSaveFilePicker } from "native-file-system-adapter"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useSDKConfig from "@/hooks/useSDKConfig"
import { showTwoFactorCodeDialog } from "@/components/dialogs/twoFactorCode"
import worker from "@/lib/worker"
import eventEmitter from "@/lib/eventEmitter"
import ChangePasswordDialog from "./dialogs/changePassword"
import Skeletons from "../skeletons"
import { useTranslation } from "react-i18next"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import useSettingsContainerSize from "@/hooks/useSettingsContainerSize"
import { cn, sanitizeFileName, downloadStringAsFile } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
import { Select, SelectItem, SelectValue, SelectTrigger, SelectContent } from "@/components/ui/select"
import { useLocalStorage } from "@uidotdev/usehooks"
import { IS_DESKTOP } from "@/constants"
import LockPinDialog from "./dialogs/lockPin"
import { getShowSaveFilePickerOptions } from "@/utils"

export const Security = memo(() => {
	const account = useAccount()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { masterKeys, userId } = useSDKConfig()
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()
	const [lockTimeout, setLockTimeout] = useLocalStorage<number>("lockTimeout", 0)

	const lockTimeoutToString = useMemo(() => {
		switch (lockTimeout) {
			case 0: {
				return t("settings.security.sections.lockTimeout.values.never")
			}

			case 1: {
				return t("settings.security.sections.lockTimeout.values.immediately")
			}

			case 60: {
				return t("settings.security.sections.lockTimeout.values.oneMinute")
			}

			case 180: {
				return t("settings.security.sections.lockTimeout.values.threeMinutes")
			}

			case 300: {
				return t("settings.security.sections.lockTimeout.values.fiveMinutes")
			}

			case 600: {
				return t("settings.security.sections.lockTimeout.values.tenMinutes")
			}

			case 900: {
				return t("settings.security.sections.lockTimeout.values.fifteenMinutes")
			}

			case 1800: {
				return t("settings.security.sections.lockTimeout.values.thirtyMinutes")
			}

			case 3600: {
				return t("settings.security.sections.lockTimeout.values.oneHour")
			}

			case 7200: {
				return t("settings.security.sections.lockTimeout.values.threeHours")
			}

			case 21600: {
				return t("settings.security.sections.lockTimeout.values.sixHours")
			}

			case 43200: {
				return t("settings.security.sections.lockTimeout.values.twelveHours")
			}

			case 86400: {
				return t("settings.security.sections.lockTimeout.values.twentyFourHours")
			}

			default: {
				return t("settings.security.sections.lockTimeout.values.never")
			}
		}
	}, [lockTimeout, t])

	const onTwoFactorChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			let toast: ReturnType<typeof loadingToast> | null = null

			try {
				if (checked) {
					if (account.settings.twoFactorEnabled === 1) {
						return
					}

					const code = await showTwoFactorCodeDialog({
						title: t("dialogs.twoFactorCode.title"),
						continueButtonText: t("dialogs.twoFactorCode.continue"),
						description: t("dialogs.twoFactorCode.info"),
						keyToDisplay:
							"otpauth://totp/" +
							encodeURIComponent("Filen") +
							":" +
							encodeURIComponent(account.account.email) +
							"?secret=" +
							encodeURIComponent(account.settings.twoFactorKey) +
							"&issuer=" +
							encodeURIComponent("Filen") +
							"&digits=6&period=30",
						keyToDisplayRaw: account.settings.twoFactorKey
					})

					if (code.cancelled) {
						return
					}

					toast = loadingToast()

					const recoveryKey = await worker.enableTwoFactorAuthentication({ twoFactorCode: code.code })

					await account.refetch()

					await showConfirmDialog({
						title: t("settings.dialogs.twoFactorAuthenticationRecoveryKey.title"),
						continueButtonText: t("settings.dialogs.twoFactorAuthenticationRecoveryKey.continue"),
						description: t("settings.dialogs.twoFactorAuthenticationRecoveryKey.description"),
						continueButtonVariant: "default",
						withInputField: recoveryKey
					})
				} else {
					if (account.settings.twoFactorEnabled === 0) {
						return
					}

					const code = await showTwoFactorCodeDialog({
						title: t("dialogs.twoFactorCode.title"),
						continueButtonText: t("dialogs.twoFactorCode.continue"),
						description: t("dialogs.twoFactorCode.info")
					})

					if (code.cancelled) {
						return
					}

					toast = loadingToast()

					await worker.disableTwoFactorAuthentication({ twoFactorCode: code.code })
					await account.refetch()
				}
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				if (toast) {
					toast.dismiss()
				}
			}
		},
		[account, loadingToast, errorToast, t]
	)

	const exportMasterKeys = useCallback(async () => {
		if (!account) {
			return
		}

		const fileName = `${sanitizeFileName(account.account.email)}.masterKeys.txt`
		const base64 = Buffer.from(
			masterKeys.map(key => "_VALID_FILEN_MASTERKEY_" + key + "@" + userId + "_VALID_FILEN_MASTERKEY_").join("|"),
			"utf-8"
		).toString("base64")
		let didWrite = false

		try {
			const fileHandle = await showSaveFilePicker(
				getShowSaveFilePickerOptions({
					name: fileName
				})
			)

			if (typeof fileHandle.createWritable !== "function") {
				throw new Error("Your browser does not support streaming downloads.")
			}

			const writer = await fileHandle.createWritable()
			const toast = loadingToast()

			try {
				await writer.write(base64)
				await writer.close()

				didWrite = true
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					if (!didWrite) {
						downloadStringAsFile(fileName, base64)

						didWrite = true
					} else {
						errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
					}
				}
			} finally {
				toast.dismiss()
			}
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				if (!didWrite) {
					downloadStringAsFile(fileName, base64)

					didWrite = true
				} else {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			}
		} finally {
			if (didWrite) {
				await worker.didExportMasterKeys().catch(() => {})

				eventEmitter.emit("useAccountRefetch")
			}
		}
	}, [loadingToast, errorToast, account, masterKeys, userId])

	const changePassword = useCallback(() => {
		eventEmitter.emit("openChangePasswordDialog")
	}, [])

	const onLockTimeoutChange = useCallback(
		(timeout: string) => {
			setLockTimeout(parseInt(timeout))
		},
		[setLockTimeout]
	)

	const openLockPinDialog = useCallback(() => {
		eventEmitter.emit("openLockPinDialog")
	}, [])

	if (!account) {
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
				<div className="flex flex-col gap-4">
					<Section
						name={t("settings.security.sections.password.name")}
						info={t("settings.security.sections.password.info")}
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "drag"
						}}
					>
						<p
							className="underline cursor-pointer"
							onClick={changePassword}
						>
							{t("settings.security.sections.password.action")}
						</p>
					</Section>
					<Section
						name={t("settings.security.sections.twoFactorAuthentication.name")}
						info={t("settings.security.sections.twoFactorAuthentication.info")}
					>
						<Switch
							checked={account.settings.twoFactorEnabled === 1}
							onCheckedChange={onTwoFactorChange}
						/>
					</Section>
					{IS_DESKTOP && (
						<>
							<Section
								name={t("settings.security.sections.lockTimeout.name")}
								info={t("settings.security.sections.lockTimeout.info")}
								className="mt-10"
							>
								<Select onValueChange={onLockTimeoutChange}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder={lockTimeoutToString} />
									</SelectTrigger>
									<SelectContent className="max-h-[200px]">
										<SelectItem value="0">{t("settings.security.sections.lockTimeout.values.never")}</SelectItem>
										<SelectItem value="60">{t("settings.security.sections.lockTimeout.values.oneMinute")}</SelectItem>
										<SelectItem value="180">
											{t("settings.security.sections.lockTimeout.values.threeMinutes")}
										</SelectItem>
										<SelectItem value="300">
											{t("settings.security.sections.lockTimeout.values.fiveMinutes")}
										</SelectItem>
										<SelectItem value="600">{t("settings.security.sections.lockTimeout.values.tenMinutes")}</SelectItem>
										<SelectItem value="1800">
											{t("settings.security.sections.lockTimeout.values.thirtyMinutes")}
										</SelectItem>
										<SelectItem value="3600">{t("settings.security.sections.lockTimeout.values.oneHour")}</SelectItem>
										<SelectItem value="7200">
											{t("settings.security.sections.lockTimeout.values.threeHours")}
										</SelectItem>
										<SelectItem value="21600">{t("settings.security.sections.lockTimeout.values.sixHours")}</SelectItem>
										<SelectItem value="43200">
											{t("settings.security.sections.lockTimeout.values.twelveHours")}
										</SelectItem>
										<SelectItem value="86400">
											{t("settings.security.sections.lockTimeout.values.twentyFourHours")}
										</SelectItem>
									</SelectContent>
								</Select>
							</Section>
							<Section
								name={t("settings.security.sections.lockPin.name")}
								info={t("settings.security.sections.lockPin.info")}
							>
								<p
									className="underline cursor-pointer"
									onClick={openLockPinDialog}
								>
									{t("settings.security.sections.lockPin.action")}
								</p>
							</Section>
						</>
					)}
					<Section
						name={t("settings.security.sections.exportMasterKeys.name")}
						info={
							!account.account.didExportMasterKeys
								? t("settings.security.sections.exportMasterKeys.subInfo")
								: t("settings.security.sections.exportMasterKeys.info")
						}
						className="mt-10"
						infoClassName={!account.account.didExportMasterKeys ? "text-bold text-primary" : undefined}
						nameClassName={!account.account.didExportMasterKeys ? "text-red-500" : undefined}
					>
						<div className="flex flex-row items-center gap-2">
							{!account.account.didExportMasterKeys && (
								<AlertTriangle
									size={16}
									className="text-red-500"
								/>
							)}
							<p
								className={cn("underline cursor-pointer", !account.account.didExportMasterKeys && "text-red-500")}
								onClick={exportMasterKeys}
							>
								{t("settings.security.sections.exportMasterKeys.action")}
							</p>
						</div>
					</Section>
					<div className="w-full h-20" />
				</div>
			</div>
			<ChangePasswordDialog />
			<LockPinDialog />
		</div>
	)
})

export default Security
