import { memo, useMemo, useCallback } from "react"
import useAccount from "@/hooks/useAccount"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IS_DESKTOP } from "@/constants"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { simpleDate, convertTimestampToMs } from "@/utils"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { showSaveFilePicker } from "native-file-system-adapter"
import worker from "@/lib/worker"
import { CheckCircle, Wallet } from "lucide-react"

export const Invoices = memo(() => {
	const account = useAccount()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const invoicesSorted = useMemo(() => {
		if (!account) {
			return []
		}

		return account.account.subsInvoices.sort((a, b) => b.timestamp - a.timestamp)
	}, [account])

	const download = useCallback(
		async (uuid: string) => {
			if (!account) {
				return
			}

			try {
				const fileHandle = await showSaveFilePicker({
					suggestedName: `Invoice_${uuid}.pdf`
				})
				const writer = await fileHandle.createWritable()

				const toast = loadingToast()

				try {
					const generatedInvoice = await worker.generateInvoice({ uuid })

					await writer.write(Buffer.from(generatedInvoice, "base64"))

					await writer.close()
				} catch (e) {
					console.error(e)

					if (!(e as unknown as Error).toString().includes("abort")) {
						errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
					}
				} finally {
					toast.dismiss()
				}
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
				}
			}
		},
		[loadingToast, errorToast, account]
	)

	if (!account) {
		return null
	}

	return (
		<div className={cn("flex flex-col w-full overflow-y-auto", IS_DESKTOP ? "h-[calc(100vh-24px)]" : "h-screen")}>
			<div className="flex flex-col w-full px-4 pb-4">
				{invoicesSorted.length === 0 && account ? (
					<div
						className={cn(
							"flex flex-col w-full items-center justify-center gap-2",
							IS_DESKTOP ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-32px)]"
						)}
					>
						<Wallet
							size={72}
							className="text-muted-foreground"
						/>
						<p>{t("settings.invoices.noInvoices")}</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("settings.invoices.plan")}</TableHead>
								<TableHead>{t("settings.invoices.paymentMethod")}</TableHead>
								<TableHead>{t("settings.invoices.amount")}</TableHead>
								<TableHead>{t("settings.invoices.date")}</TableHead>
								<TableHead>{t("settings.invoices.paid")}</TableHead>
								<TableHead className="text-right">&nbsp;</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invoicesSorted.map(invoice => (
								<TableRow key={invoice.id}>
									<TableCell>{invoice.planName}</TableCell>
									<TableCell>
										{invoice.gateway.includes("paypal")
											? "Paypal"
											: invoice.gateway.includes("stripe")
												? "Stripe"
												: "Crypto"}
									</TableCell>
									<TableCell>{invoice.planCost}€</TableCell>
									<TableCell>{simpleDate(convertTimestampToMs(invoice.timestamp))}</TableCell>
									<TableCell>
										<CheckCircle size={15} />
									</TableCell>
									<TableCell className="text-right">
										<p
											className="hover:underline cursor-pointer"
											onClick={() => download(invoice.id)}
										>
											{t("settings.invoices.download")}
										</p>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	)
})

export default Invoices
