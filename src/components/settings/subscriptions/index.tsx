import { memo, useMemo, useCallback } from "react"
import useAccount from "@/hooks/useAccount"
import { IS_DESKTOP, DESKTOP_TOPBAR_HEIGHT } from "@/constants"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { formatBytes, convertTimestampToMs } from "@/utils"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import worker from "@/lib/worker"
import { Gem, CheckCircle, XCircle, Hourglass } from "lucide-react"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import Skeletons from "../skeletons"
import { useUserStore } from "@/stores/user.store"

export const Subscriptions = memo(() => {
	const account = useAccount()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()
	const { cancelledSubs, setCancelledSubs } = useUserStore(
		useCallback(
			state => ({
				cancelledSubs: state.cancelledSubs,
				setCancelledSubs: state.setCancelledSubs
			}),
			[]
		)
	)

	const subscriptionsSorted = useMemo(() => {
		if (!account) {
			return []
		}

		return account.account.subs
			.sort((a, b) => b.startTimestamp - a.startTimestamp)
			.map(sub =>
				cancelledSubs.includes(sub.id)
					? {
							...sub,
							cancelled: 1,
							cancelTimestamp: Date.now()
						}
					: sub
			)
	}, [account, cancelledSubs])

	const cancel = useCallback(
		async (uuid: string, startTimestamp: number) => {
			if (!account) {
				return
			}

			if (convertTimestampToMs(startTimestamp) + 24 * 3600 * 1000 > Date.now()) {
				errorToast(t("settings.subscriptions.statuses.cancelled"))

				return
			}

			if (
				!(await showConfirmDialog({
					title: t("settings.dialogs.cancelSubscription.title"),
					continueButtonText: t("settings.dialogs.cancelSubscription.continue"),
					description: t("settings.dialogs.cancelSubscription.description"),
					cancelButtonText: t("settings.dialogs.cancelSubscription.close"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.cancelSubscription({ uuid })

				setCancelledSubs(prev => [...prev, uuid])

				await account.refetch()
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account, t, setCancelledSubs]
	)

	if (!account) {
		return <Skeletons />
	}

	return (
		<div
			className="flex flex-col w-full overflow-y-auto"
			style={{
				height: "calc(100dvh - " + DESKTOP_TOPBAR_HEIGHT + "px)"
			}}
		>
			<div className="flex flex-col w-full">
				{subscriptionsSorted.length === 0 && account ? (
					<div
						className={cn(
							"flex flex-col w-full items-center justify-center gap-2",
							IS_DESKTOP ? "h-[calc(100dvh-48px)]" : "h-[calc(100dvh-32px)]"
						)}
					>
						<Gem
							size={72}
							className="text-muted-foreground"
						/>
						<p>{t("settings.subscriptions.noSubscriptions")}</p>
					</div>
				) : (
					<div className="flex flex-col w-full p-4">
						{subscriptionsSorted.map(subscription => (
							<div
								key={subscription.id}
								className="flex flex-col bg-background border rounded-lg max-w-[600px] mb-4"
							>
								<div className="flex flex-row p-4 pb-2 items-center justify-between">
									<p className="text-lg">{subscription.planName}</p>
									{subscription.cancelled === 1 && (
										<div className="flex flex-row items-center gap-2">
											<XCircle
												className="text-red-500"
												size={18}
											/>
											<p>{t("settings.subscriptions.statuses.cancelled")}</p>
										</div>
									)}
									{subscription.cancelled === 0 && subscription.activated === 1 && (
										<div className="flex flex-row items-center gap-2">
											<CheckCircle
												className="text-green-500"
												size={18}
											/>
											<p>{t("settings.subscriptions.statuses.active")}</p>
										</div>
									)}
									{subscription.cancelled === 0 && subscription.activated === 0 && (
										<div className="flex flex-row items-center gap-2">
											<Hourglass size={18} />
											<p>{t("settings.subscriptions.statuses.waiting")}</p>
										</div>
									)}
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
												? "PayPal"
												: subscription.gateway.includes("stripe")
													? "Stripe"
													: "Crypto"}
										</p>
										{subscription.activated === 1 &&
											subscription.cancelled === 0 &&
											!subscription.planName.toLowerCase().includes("lifetime") && (
												<p
													className="text-sm underline mt-3 cursor-pointer text-red-500"
													onClick={() => cancel(subscription.id, subscription.startTimestamp)}
												>
													{t("settings.subscriptions.cancel")}
												</p>
											)}
										{subscription.gateway.includes("stripe") &&
											!subscription.planName.toLowerCase().includes("lifetime") && (
												<a
													href="https://billing.stripe.com/p/login/6oE9Bl8Lxey0ayI9AA"
													target="blank"
												>
													<p className="text-sm underline mt-3 cursor-pointer text-blue-500">
														{t("settings.subscriptions.billingDetails")}
													</p>
												</a>
											)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
})

export default Subscriptions
