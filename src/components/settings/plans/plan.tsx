import { memo, useCallback, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes } from "@/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IoLogoPaypal, IoCheckmark } from "react-icons/io5"
import { FaCcStripe, FaBitcoin } from "react-icons/fa6"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { type PaymentMethods } from "@filen/sdk/dist/types/api/v3/user/sub/create"
import { RemoteConfigPlan } from "@/types"
import { Loader } from "lucide-react"
import { useRemoteConfigStore } from "@/stores/remoteConfig.store"
import { type UserAccountResponse } from "@filen/sdk/dist/types/api/v3/user/account"
import eventEmitter from "@/lib/eventEmitter"

export const Plan = memo(({ plan, account }: { plan: RemoteConfigPlan; account: UserAccountResponse }) => {
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const [isCreatingSubURL, setIsCreatingSubURL] = useState<boolean>(false)
	const [subURL, setSubURL] = useState<string>("")
	const config = useRemoteConfigStore(useCallback(state => state.config, []))

	const cryptoAvailable = useMemo(() => {
		return plan.name.toLowerCase().includes("lifetime") || plan.term === "lifetime"
	}, [plan.name, plan.term])

	const hasCountrySet = useMemo(() => {
		return typeof account.personal.country === "string" && account.personal.country.length > 0
	}, [account.personal.country])

	const buyPlan = useCallback(
		async ({ planId, paymentMethod }: { planId: number; paymentMethod: PaymentMethods }) => {
			if (isCreatingSubURL || subURL.length > 0 || (paymentMethod === "crypto" && !cryptoAvailable)) {
				return
			}

			if (!hasCountrySet) {
				eventEmitter.emit("openChangePersonalInformationDialog", {
					needsCountrySetup: true
				})

				return
			}

			setIsCreatingSubURL(true)

			try {
				const url = await worker.createSubscription({
					planId,
					paymentMethod
				})

				setSubURL(url)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				setIsCreatingSubURL(false)
			}
		},
		[errorToast, isCreatingSubURL, subURL, cryptoAvailable, hasCountrySet]
	)

	if (!config) {
		return null
	}

	return (
		<Card
			key={plan.id}
			className="w-auto"
		>
			<CardHeader>
				<CardTitle>
					{plan.name}
					{!plan.name.toLowerCase().includes("starter") ? " " + plan.term : ""}
				</CardTitle>
				<div>
					{config.pricing.saleEnabled ? (
						<div className="flex flex-col">
							<p className="line-through text-muted-foreground text-sm">{plan.cost}€</p>
							<p className="text-lg text-primary">{plan.sale}€</p>
							<p className="text-red-500">🎉 -{Math.round(100 - (plan.sale / plan.cost) * 100)}%</p>
						</div>
					) : (
						<p className="text-lg text-muted-foreground">{plan.cost}€</p>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<p>{formatBytes(plan.storage)}</p>
				{(plan.term === "lifetime" || config.pricing.saleEnabled) && (
					<p className="text-xs text-muted-foreground">{t("settings.plans.limited")}</p>
				)}
				<div className="flex flex-col mt-6 gap-2">
					{new Array(9).fill(0).map((_, index) => {
						return (
							<div
								key={index}
								className="flex flex-row items-center gap-2 line-clamp-1 text-ellipsis break-all"
							>
								<IoCheckmark />
								<p className="text-sm text-muted-foreground">{t(`settings.plans.features.pro.${index + 1}`)}</p>
							</div>
						)
					})}
				</div>
			</CardContent>
			<CardFooter>
				{isCreatingSubURL ? (
					<Button
						disabled={true}
						className="flex flex-row items-center gap-2"
					>
						<Loader
							className="animate-spin-medium"
							size={16}
						/>
						<p>{t("settings.plans.buyNow")}</p>
					</Button>
				) : subURL.length > 0 ? (
					<a
						href={subURL}
						target="_blank"
					>
						<Button variant="destructive">{t("settings.plans.payInvoice")}</Button>
					</a>
				) : (
					<DropdownMenu>
						<DropdownMenuTrigger asChild={true}>
							<Button>{t("settings.plans.buyNow")}</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem
								className="flex flex-row gap-3 items-center cursor-pointer"
								onClick={() =>
									buyPlan({
										planId: plan.id,
										paymentMethod: "stripe"
									})
								}
							>
								<FaCcStripe />
								<p>{t("settings.plans.creditCard")}</p>
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex flex-row gap-3 items-center cursor-pointer"
								onClick={() =>
									buyPlan({
										planId: plan.id,
										paymentMethod: "paypal"
									})
								}
							>
								<IoLogoPaypal />
								<p>PayPal</p>
							</DropdownMenuItem>
							{cryptoAvailable && (
								<DropdownMenuItem
									className="flex flex-row gap-3 items-center cursor-pointer"
									onClick={() =>
										buyPlan({
											planId: plan.id,
											paymentMethod: "crypto"
										})
									}
								>
									<FaBitcoin />
									<p>{t("settings.plans.crypto")}</p>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</CardFooter>
		</Card>
	)
})

export default Plan
