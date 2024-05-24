import { memo, useMemo, useCallback } from "react"
import useAccount from "@/hooks/useAccount"
import { IS_DESKTOP } from "@/constants"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { formatBytes } from "@/utils"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import worker from "@/lib/worker"
import { Gem, Loader } from "lucide-react"
import { showConfirmDialog } from "@/components/dialogs/confirm"

export const Subscriptions = memo(() => {
	const account = useAccount()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const subscriptionsSorted = useMemo(() => {
		if (!account) {
			return []
		}

		return account.account.subs.sort((a, b) => b.startTimestamp - a.startTimestamp)
	}, [account])

	const cancel = useCallback(
		async (uuid: string) => {
			if (!account) {
				return
			}

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

			const toast = loadingToast()

			try {
				await worker.cancelSubscription({ uuid })
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

	if (!account) {
		return (
			<div
				className={cn(
					"flex flex-col w-full items-center justify-center gap-2",
					IS_DESKTOP ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-32px)]"
				)}
			>
				<Loader className="animate-spin-medium" />
			</div>
		)
	}

	return (
		<div className={cn("flex flex-col w-full overflow-y-auto", IS_DESKTOP ? "h-[calc(100vh-24px)]" : "h-screen")}>
			<div className="flex flex-col w-full p-4">
				{subscriptionsSorted.length === 0 && account ? (
					<div
						className={cn(
							"flex flex-col w-full items-center justify-center gap-2",
							IS_DESKTOP ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-32px)]"
						)}
					>
						<Gem
							size={72}
							className="text-muted-foreground"
						/>
						<p>{t("settings.subscriptions.noSubscriptions")}</p>
					</div>
				) : (
					subscriptionsSorted.map(subscription => (
						<div
							key={subscription.id}
							className="flex flex-col bg-background border rounded-lg max-w-[600px] mb-4"
						>
							<div className="flex flex-row p-4 pb-0">
								<p className="text-lg">{subscription.planName}</p>
							</div>
							<div className="flex flex-row rounded-md p-4 gap-10">
								<div className="flex flex-col gap-1">
									<p>{subscription.planCost}€</p>
									<p className="text-muted-foreground text-sm">
										{t("settings.subscriptions.info", {
											storage: formatBytes(subscription.storage)
										})}
									</p>
									<a
										className="text-sm underline mt-3"
										target="_blank"
										href="https://filen.io/pricing"
									>
										{t("settings.subscriptions.moreInfo")}
									</a>
								</div>
								<div className="flex flex-col gap-1 shrink-0">
									<p>{t("settings.subscriptions.paymentMethod")}</p>
									<p className="text-muted-foreground">
										{subscription.gateway.includes("paypal")
											? "Paypal"
											: subscription.gateway.includes("stripe")
												? "Stripe"
												: "Crypto"}
									</p>
									<p
										className="text-sm underline mt-3 cursor-pointer"
										onClick={() => cancel(subscription.id)}
									>
										{t("settings.subscriptions.cancel")}
									</p>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
})

export default Subscriptions
