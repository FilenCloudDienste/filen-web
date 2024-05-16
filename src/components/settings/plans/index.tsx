import { memo, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes } from "@/utils"
import { Button } from "@/components/ui/button"

export const Plans = memo(() => {
	const { t } = useTranslation()

	const query = useQuery({
		queryKey: ["cdnConfig"],
		queryFn: () => worker.cdnConfig()
	})

	const plans = useMemo(() => {
		if (!query.isSuccess) {
			return {
				starter: [],
				monthly: [],
				annually: [],
				lifetime: []
			}
		}

		return {
			starter: query.data.pricing.plans.filter(plan => plan.name.toLowerCase().includes("starter")),
			monthly: query.data.pricing.plans.filter(
				plan => plan.term.toLowerCase().includes("monthly") && !plan.name.toLowerCase().includes("starter")
			),
			annually: query.data.pricing.plans.filter(
				plan => plan.term.toLowerCase().includes("annually") && !plan.name.toLowerCase().includes("starter")
			),
			lifetime: query.data.pricing.lifetimeEnabled
				? query.data.pricing.plans.filter(
						plan => plan.term.toLowerCase().includes("lifetime") && !plan.name.toLowerCase().includes("starter")
					)
				: []
		}
	}, [query.isSuccess, query.data])

	if (!query.isSuccess) {
		return null
	}

	return (
		<div className="flex flex-row w-full h-full p-4 justify-center">
			<Tabs
				defaultValue="monthly"
				className="flex flex-col items-center"
			>
				<TabsList>
					<TabsTrigger value="starter">{t("settings.plans.starter")}</TabsTrigger>
					<TabsTrigger value="monthly">{t("settings.plans.monthly")}</TabsTrigger>
					<TabsTrigger value="annually">{t("settings.plans.annually")}</TabsTrigger>
					{query.data.pricing.lifetimeEnabled && <TabsTrigger value="lifetime">{t("settings.plans.lifetime")}</TabsTrigger>}
				</TabsList>
				{["starter", "monthly", "annually", "lifetime"].map(term => {
					return (
						<TabsContent value={term}>
							<div className="flex flex-row gap-2 mt-8 flex-wrap justify-center">
								{(term === "starter"
									? plans.starter
									: term === "monthly"
										? plans.monthly
										: term === "annually"
											? plans.annually
											: plans.lifetime
								).map(plan => {
									return (
										<Card
											key={plan.id}
											className="w-[190px]"
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
												<Button>{t("settings.plans.buyNow")}</Button>
											</CardFooter>
										</Card>
									)
								})}
							</div>
						</TabsContent>
					)
				})}
			</Tabs>
		</div>
	)
})

export default Plans
