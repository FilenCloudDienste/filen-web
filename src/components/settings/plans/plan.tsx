import { memo, useCallback, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes } from "@/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IoLogoPaypal } from "react-icons/io5"
import { FaCcStripe, FaBitcoin } from "react-icons/fa6"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { type PaymentMethods } from "@filen/sdk/dist/types/api/v3/user/sub/create"
import { RemoteConfigPlan } from "@/types"
import { Loader } from "lucide-react"
import { useRemoteConfigStore } from "@/stores/remoteConfig.store"

export const Plan = memo(({ plan }: { plan: RemoteConfigPlan }) => {
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const [isCreatingSubURL, setIsCreatingSubURL] = useState<boolean>(false)
	const [subURL, setSubURL] = useState<string>("")
	const config = useRemoteConfigStore(useCallback(state => state.config, []))

	const cryptoAvailable = useMemo(() => {
		return plan.name.toLowerCase().includes("lifetime") || plan.term === "lifetime"
	}, [plan.name, plan.term])

	const buyPlan = useCallback(
		async ({ planId, paymentMethod }: { planId: number; paymentMethod: PaymentMethods }) => {
			if (isCreatingSubURL || subURL.length > 0 || (paymentMethod === "crypto" && !cryptoAvailable)) {
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
		[errorToast, isCreatingSubURL, subURL, cryptoAvailable]
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
					<p>
						{plan.name}
						{!plan.name.toLowerCase().includes("starter") ? " " + plan.term : ""}
					</p>
				</CardTitle>
				<CardDescription>
					{config.pricing.saleEnabled ? (
						<div className="flex flex-col">
							<p className="line-through">{plan.cost}€</p>
							<p className="text-lg text-primary">{plan.sale}€</p>
							<p className="text-red-500">🎉 -{Math.round(100 - (plan.sale / plan.cost) * 100)}%</p>
						</div>
					) : (
						<p className="text-lg text-muted-foreground">{plan.cost}€</p>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>{formatBytes(plan.storage)}</p>
				{plan.term === "lifetime" && <p className="text-xs text-muted-foreground">{t("settings.plans.limited")}</p>}
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
