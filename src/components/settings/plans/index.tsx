import { memo, useMemo, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import Plan from "./plan"
import Skeletons from "../skeletons"
import { useRemoteConfigStore } from "@/stores/remoteConfig.store"
import useAccount from "@/hooks/useAccount"
import ChangePersonalInformationDialog from "../account/dialogs/personalInformation"

export const Plans = memo(() => {
	const { t } = useTranslation()
	const config = useRemoteConfigStore(useCallback(state => state.config, []))
	const account = useAccount()

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

	if (!config || !account) {
		return <Skeletons />
	}

	return (
		<div className="flex flex-col w-full h-[100dvh] p-8 overflow-x-hidden overflow-y-auto">
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
											account={account.account}
										/>
									)
								})}
							</div>
							<div className="flex flex-col my-10 text-xs text-muted-foreground justify-center items-center">
								<p className="max-w-[500px] text-center">{t("settings.plans.legal1")}</p>
								<p className="max-w-[500px] text-center">
									{t("settings.plans.legal2")}{" "}
									<a
										href="https://filen.io/terms"
										target="_blank"
										className="text-blue-500 hover:underline"
									>
										{t("settings.plans.tos")}
									</a>{" "}
									{t("settings.plans.and")}{" "}
									<a
										href="https://filen.io/privacy"
										target="_blank"
										className="text-blue-500 hover:underline"
									>
										{t("settings.plans.privacyPolicy")}
									</a>
									.
								</p>
							</div>
						</TabsContent>
					)
				})}
			</Tabs>
			<ChangePersonalInformationDialog account={account.account} />
		</div>
	)
})

export default Plans
