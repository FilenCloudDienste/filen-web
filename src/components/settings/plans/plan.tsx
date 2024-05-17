import { memo, useCallback, useState } from "react"
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
import { type CDNConfigPlan } from "@/lib/worker/worker"
import { Loader } from "lucide-react"

export const Plan = memo(({ plan }: { plan: CDNConfigPlan }) => {
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const [isCreatingSubURL, setIsCreatingSubURL] = useState<boolean>(false)
	const [subURL, setSubURL] = useState<string>("")

	const buyPlan = useCallback(
		async ({ planId, paymentMethod }: { planId: number; paymentMethod: PaymentMethods }) => {
			if (isCreatingSubURL || subURL.length > 0) {
				return
			}

			setIsCreatingSubURL(true)

			try {
				const url = await worker.createSubscription({ planId, paymentMethod })

				setSubURL(url)
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				setIsCreatingSubURL(false)
			}
		},
		[errorToast, isCreatingSubURL, subURL]
	)

	return (
		<Card
			key={plan.id}
			className="w-[200px]"
		>
			<CardHeader>
				<CardTitle>{plan.name}</CardTitle>
				<CardDescription>
					{plan.cost}€ {plan.term}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>{formatBytes(plan.storage)}</p>
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
								<p>Credit Card</p>
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
								<p>Crypto</p>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</CardFooter>
		</Card>
	)
})

export default Plan
