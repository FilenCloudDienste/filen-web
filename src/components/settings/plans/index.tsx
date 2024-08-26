import { memo, useMemo, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import Plan from "./plan"
import Skeletons from "../skeletons"
import { useRemoteConfigStore } from "@/stores/remoteConfig.store"

export const Plans = memo(() => {
	const { t } = useTranslation()
	const config = useRemoteConfigStore(useCallback(state => state.config, []))

	const plans = useMemo(() => {
		if (!config) {
			return {
				starter: [],
				monthly: [],
				annually: [],
				lifetime: []
			}
		}

		return {
			starter: config.pricing.plans.filter(plan => plan.name.toLowerCase().includes("starter")),
			monthly: config.pricing.plans.filter(
				plan => plan.term.toLowerCase().includes("monthly") && !plan.name.toLowerCase().includes("starter")
			),
			annually: config.pricing.plans.filter(
				plan => plan.term.toLowerCase().includes("annually") && !plan.name.toLowerCase().includes("starter")
			),
			lifetime: config.pricing.lifetimeEnabled
				? config.pricing.plans.filter(
						plan => plan.term.toLowerCase().includes("lifetime") && !plan.name.toLowerCase().includes("starter")
					)
				: []
		}
	}, [config])

	if (!config) {
		return <Skeletons />
	}

	return (
		<div className="flex flex-col w-full h-full p-8 justify-center">
			<Tabs
				defaultValue="monthly"
				className="flex flex-col items-center"
			>
				<TabsList>
					<TabsTrigger value="starter">{t("settings.plans.starter")}</TabsTrigger>
					<TabsTrigger value="monthly">{t("settings.plans.monthly")}</TabsTrigger>
					<TabsTrigger value="annually">{t("settings.plans.annually")}</TabsTrigger>
					{config.pricing.lifetimeEnabled && <TabsTrigger value="lifetime">✨ {t("settings.plans.lifetime")}</TabsTrigger>}
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
								<p className="max-w-[500px] text-center">{t("settings.plans.legal1")}</p>
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
