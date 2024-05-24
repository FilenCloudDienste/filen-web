import { memo, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import worker from "@/lib/worker"
import Plan from "./plan"
import { Loader } from "lucide-react"
import { IS_DESKTOP } from "@/constants"
import { cn } from "@/lib/utils"

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
		<div className="flex flex-col w-full h-full p-6 justify-center">
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
						<TabsContent
							value={term}
							key={term}
						>
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
										<Plan
											key={plan.id}
											plan={plan}
										/>
									)
								})}
							</div>
							<div className="flex flex-col mt-10 text-xs text-muted-foreground justify-center items-center">
								<p className="max-w-[500px] text-center">
									By purchasing a plan you authorize Filen to automatically charge you each billing period until you
									cancel. You can cancel anytime via your Account page. No partial refunds.
								</p>
								<p>
									You also automatically agree to our{" "}
									<a
										href="https://filen.io/terms"
										target="_blank"
										className="text-blue-500 hover:underline"
									>
										Terms of Service
									</a>{" "}
									and{" "}
									<a
										href="https://filen.io/privacy"
										target="_blank"
										className="text-blue-500 hover:underline"
									>
										Privacy Policy
									</a>
									.
								</p>
							</div>
						</TabsContent>
					)
				})}
			</Tabs>
		</div>
	)
})

export default Plans
