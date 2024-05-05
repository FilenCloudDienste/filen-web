import { memo, useCallback } from "react"
import useAccount from "@/hooks/useAccount"
import Section from "../section"
import { Switch } from "@/components/ui/switch"
import { showSaveFilePicker } from "native-file-system-adapter"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useSDKConfig from "@/hooks/useSDKConfig"

export const Security = memo(() => {
	const account = useAccount()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { masterKeys, userId } = useSDKConfig()

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
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					const toast = errorToast((e as unknown as Error).toString())

					toast.update({
						id: toast.id,
						duration: 5000
					})
				}
			} finally {
				toast.dismiss()
			}
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				const toast = errorToast((e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			}
		} finally {
			const input = document.getElementById("avatar-input") as HTMLInputElement

			input.value = ""
		}
	}, [loadingToast, errorToast, account, masterKeys, userId])

	if (!account) {
		return null
	}

	return (
		<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
			<div className="flex flex-col p-6 w-5/6 h-full">
				<div className="flex flex-col gap-4">
					<Section
						name="Password"
						info="Change your password"
					>
						<p className="underline cursor-pointer">Change</p>
					</Section>
					<Section
						name="Two Factor Authentication"
						info="Enable or disable Two Factor Authentication"
					>
						<Switch checked={account.settings.twoFactorEnabled === 1} />
					</Section>
					<Section
						name="Export master keys"
						info="Export your master keys so that you can restore your account in case you need to reset your password. You need to export your master keys everytime you change your password."
						className="mt-10"
					>
						<p
							className="underline cursor-pointer"
							onClick={exportMasterKeys}
						>
							Export
						</p>
					</Section>
					<div className="w-full h-20" />
				</div>
			</div>
		</div>
	)
})

export default Security
