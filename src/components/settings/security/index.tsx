import { memo, useCallback } from "react"
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
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

export const Security = memo(() => {
	const account = useAccount()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { masterKeys, userId } = useSDKConfig()
	const { t } = useTranslation()
	const settingsContainerSize = useSettingsContainerSize()

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

		try {
			const fileHandle = await showSaveFilePicker({
				suggestedName: `${account.account.email}.masterKeys.txt`
			})
			const writer = await fileHandle.createWritable()

			const toast = loadingToast()

			try {
				await writer.write(
					Buffer.from(
						masterKeys.map(key => "_VALID_FILEN_MASTERKEY_" + key + "@" + userId + "_VALID_FILEN_MASTERKEY_").join("|"),
						"utf-8"
					).toString("base64")
				)

				await writer.close()

				await worker.didExportMasterKeys()

				eventEmitter.emit("useAccountRefetch")
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
	}, [loadingToast, errorToast, account, masterKeys, userId])

	const changePassword = useCallback(() => {
		eventEmitter.emit("openChangePasswordDialog")
	}, [])

	if (!account) {
		return <Skeletons />
	}

	return (
		<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
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
					<Section
						name={t("settings.security.sections.exportMasterKeys.name")}
						info={t("settings.security.sections.exportMasterKeys.info")}
						className="mt-10"
						nameClassName={!account.account.didExportMasterKeys ? "text-red-500" : undefined}
						subInfo={
							!account.account.didExportMasterKeys ? t("settings.security.sections.exportMasterKeys.subInfo") : undefined
						}
						subInfoClassName={!account.account.didExportMasterKeys ? "text-bold mt-4" : undefined}
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
		</div>
	)
})

export default Security
