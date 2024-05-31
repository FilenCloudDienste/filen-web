import { memo, useCallback } from "react"
import useAccount from "@/hooks/useAccount"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useSuccessToast from "@/hooks/useSuccessToast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Section from "../section"
import { formatBytes } from "@/utils"
import Skeletons from "../skeletons"

export const Invite = memo(() => {
	const account = useAccount()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const successToast = useSuccessToast()

	const copyLink = useCallback(async () => {
		if (!account) {
			return
		}

		try {
			await navigator.clipboard.writeText(`https://filen.io/r/${account.account.refId}`)

			successToast(t("copiedToClipboard"))
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		}
	}, [account, successToast, errorToast, t])

	if (!account) {
		return <Skeletons />
	}

	return (
		<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
			<div className="flex flex-col p-6 w-4/6 h-full">
				<p>{t("settings.invite.title")}</p>
				<p className="text-muted-foreground text-sm">
					{t("settings.invite.description", {
						yourEarnings: formatBytes(account.account.refStorage),
						otherEarnings: formatBytes(account.account.refStorage)
					})}
				</p>
				<div className="flex flex-row gap-1 mt-6">
					<Input
						value={`https://filen.io/r/${account.account.refId}`}
						onChange={e => e.preventDefault()}
					/>
					<Button onClick={copyLink}>{t("settings.invite.copy")}</Button>
				</div>
				<Section
					name="Storage earned"
					className="mt-6"
				>
					<p>
						{t("settings.invite.earned", {
							earned: formatBytes(
								account.account.referStorage > account.account.refStorage * account.account.refLimit
									? account.account.refStorage * account.account.refLimit
									: account.account.referStorage
							),
							max: formatBytes(account.account.refStorage * account.account.refLimit)
						})}
					</p>
				</Section>
			</div>
		</div>
	)
})

export default Invite
