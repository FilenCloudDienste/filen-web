import { memo, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import worker from "@/lib/worker"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type UserAccountResponse } from "@filen/sdk/dist/types/api/v3/user/account"

export const countries: string[] = [
	"Afghanistan",
	"Albania",
	"Algeria",
	"Andorra",
	"Angola",
	"Antigua and Barbuda",
	"Argentina",
	"Armenia",
	"Australia",
	"Austria",
	"Azerbaijan",
	"Bahamas",
	"Bahrain",
	"Bangladesh",
	"Barbados",
	"Belarus",
	"Belgium",
	"Belize",
	"Benin",
	"Bhutan",
	"Bolivia",
	"Bosnia and Herzegovina",
	"Botswana",
	"Brazil",
	"Brunei",
	"Bulgaria",
	"Burkina Faso",
	"Burundi",
	"Cabo Verde",
	"Cambodia",
	"Cameroon",
	"Canada",
	"Central African Republic",
	"Chad",
	"Chile",
	"China",
	"Colombia",
	"Comoros",
	"Democratic Republic of the Congo",
	"Republic of the Congo",
	"Costa Rica",
	"Cote d'Ivoire",
	"Croatia",
	"Cuba",
	"Cyprus",
	"Czech Republic",
	"Denmark",
	"Djibouti",
	"Dominica",
	"Dominican Republic",
	"Ecuador",
	"Egypt",
	"El Salvador",
	"Equatorial Guinea",
	"Eritrea",
	"Estonia",
	"Eswatini",
	"Ethiopia",
	"Fiji",
	"Finland",
	"France",
	"Gabon",
	"Gambia",
	"Georgia",
	"Germany",
	"Ghana",
	"Greece",
	"Grenada",
	"Guatemala",
	"Guinea",
	"Guinea-Bissau",
	"Guyana",
	"Haiti",
	"Honduras",
	"Hungary",
	"Iceland",
	"India",
	"Indonesia",
	"Iran",
	"Iraq",
	"Ireland",
	"Israel",
	"Italy",
	"Jamaica",
	"Japan",
	"Jordan",
	"Kazakhstan",
	"Kenya",
	"Kiribati",
	"North Korea",
	"South Korea",
	"Kosovo",
	"Kuwait",
	"Kyrgyzstan",
	"Laos",
	"Latvia",
	"Lebanon",
	"Lesotho",
	"Liberia",
	"Libya",
	"Liechtenstein",
	"Lithuania",
	"Luxembourg",
	"Madagascar",
	"Malawi",
	"Malaysia",
	"Maldives",
	"Mali",
	"Malta",
	"Marshall Islands",
	"Mauritania",
	"Mauritius",
	"Mexico",
	"Micronesia",
	"Moldova",
	"Monaco",
	"Mongolia",
	"Montenegro",
	"Morocco",
	"Mozambique",
	"Myanmar",
	"Namibia",
	"Nauru",
	"Nepal",
	"Netherlands",
	"New Zealand",
	"Nicaragua",
	"Niger",
	"Nigeria",
	"North Macedonia",
	"Norway",
	"Oman",
	"Pakistan",
	"Palau",
	"Palestine",
	"Panama",
	"Papua New Guinea",
	"Paraguay",
	"Peru",
	"Philippines",
	"Poland",
	"Portugal",
	"Qatar",
	"Romania",
	"Russia",
	"Rwanda",
	"Saint Kitts and Nevis",
	"Saint Lucia",
	"Saint Vincent and the Grenadines",
	"Samoa",
	"San Marino",
	"Sao Tome and Principe",
	"Saudi Arabia",
	"Senegal",
	"Serbia",
	"Seychelles",
	"Sierra Leone",
	"Singapore",
	"Slovakia",
	"Slovenia",
	"Solomon Islands",
	"Somalia",
	"South Africa",
	"South Sudan",
	"Spain",
	"Sri Lanka",
	"Sudan",
	"Suriname",
	"Sweden",
	"Switzerland",
	"Syria",
	"Taiwan",
	"Tajikistan",
	"Tanzania",
	"Thailand",
	"Timor-Leste",
	"Togo",
	"Tonga",
	"Trinidad and Tobago",
	"Tunisia",
	"Turkey",
	"Turkmenistan",
	"Tuvalu",
	"Uganda",
	"Ukraine",
	"United Arab Emirates",
	"United Kingdom",
	"United States",
	"Uruguay",
	"Uzbekistan",
	"Vanuatu",
	"Vatican City",
	"Venezuela",
	"Vietnam",
	"Yemen",
	"Zambia",
	"Zimbabwe"
]

export const ChangePersonalInformationDialog = memo(({ account }: { account: UserAccountResponse }) => {
	const [open, setOpen] = useState<boolean>(false)
	const { t } = useTranslation()
	const [inputs, setInputs] = useState<Required<Parameters<typeof worker.updatePersonalInformation>[0]>>({
		city: account.personal.city ? account.personal.city : "",
		postalCode: account.personal.postalCode ? account.personal.postalCode : "",
		street: account.personal.street ? account.personal.street : "",
		streetNumber: account.personal.streetNumber ? account.personal.streetNumber : "",
		vatId: account.personal.vatId ? account.personal.vatId : "",
		companyName: account.personal.companyName ? account.personal.companyName : "",
		country: account.personal.country ? account.personal.country : "",
		firstName: account.personal.firstName ? account.personal.firstName : "",
		lastName: account.personal.lastName ? account.personal.lastName : ""
	})
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const close = useCallback(() => {
		setOpen(false)
	}, [])

	const onFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			firstName: e.target.value
		}))
	}, [])

	const onLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			lastName: e.target.value
		}))
	}, [])

	const onCompanyNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			companyName: e.target.value
		}))
	}, [])

	const onVatIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			vatId: e.target.value
		}))
	}, [])

	const onStreetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			street: e.target.value
		}))
	}, [])

	const onStreetNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			streetNumber: e.target.value
		}))
	}, [])

	const onCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			city: e.target.value
		}))
	}, [])

	const onPostalCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs(prev => ({
			...prev,
			postalCode: e.target.value
		}))
	}, [])

	const onCountryChange = useCallback((country: string) => {
		setInputs(prev => ({
			...prev,
			country
		}))
	}, [])

	const save = useCallback(async () => {
		const toast = loadingToast()

		try {
			await worker.updatePersonalInformation(inputs)

			eventEmitter.emit("useAccountRefetch")

			setTimeout(() => setOpen(false), 100)

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, inputs])

	useEffect(() => {
		const listener = eventEmitter.on("openChangePersonalInformationDialog", () => {
			setInputs({
				city: account.personal.city ? account.personal.city : "",
				postalCode: account.personal.postalCode ? account.personal.postalCode : "",
				street: account.personal.street ? account.personal.street : "",
				streetNumber: account.personal.streetNumber ? account.personal.streetNumber : "",
				vatId: account.personal.vatId ? account.personal.vatId : "",
				companyName: account.personal.companyName ? account.personal.companyName : "",
				country: account.personal.country ? account.personal.country : "",
				firstName: account.personal.firstName ? account.personal.firstName : "",
				lastName: account.personal.lastName ? account.personal.lastName : ""
			})

			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [account])

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogContent className="outline-none focus:outline-none active:outline-none hover:outline-none">
				<DialogHeader>{t("dialogs.personalInformation.title")}</DialogHeader>
				<div className="flex flex-col gap-3 mb-3">
					<div className="flex flex-row gap-4 justify-between items-center">
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.firstName")}</p>
							<Input
								type="text"
								value={inputs.firstName}
								onChange={onFirstNameChange}
								placeholder={t("dialogs.personalInformation.firstName")}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.lastName")}</p>
							<Input
								type="text"
								value={inputs.lastName}
								onChange={onLastNameChange}
								placeholder={t("dialogs.personalInformation.lastName")}
							/>
						</div>
					</div>
					<div className="flex flex-row gap-4 justify-between items-center">
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.companyName")}</p>
							<Input
								type="text"
								value={inputs.companyName}
								onChange={onCompanyNameChange}
								placeholder={t("dialogs.personalInformation.companyName")}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.vatId")}</p>
							<Input
								type="text"
								value={inputs.vatId}
								onChange={onVatIdChange}
								placeholder={t("dialogs.personalInformation.vatId")}
							/>
						</div>
					</div>
					<div className="flex flex-row gap-4 justify-between items-center">
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.street")}</p>
							<Input
								type="text"
								value={inputs.street}
								onChange={onStreetChange}
								placeholder={t("dialogs.personalInformation.street")}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.streetNumber")}</p>
							<Input
								type="text"
								value={inputs.streetNumber}
								onChange={onStreetNumberChange}
								placeholder={t("dialogs.personalInformation.streetNumber")}
							/>
						</div>
					</div>
					<div className="flex flex-row gap-4 justify-between items-center">
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.city")}</p>
							<Input
								type="text"
								value={inputs.city}
								onChange={onCityChange}
								placeholder={t("dialogs.personalInformation.city")}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.postalCode")}</p>
							<Input
								type="text"
								value={inputs.postalCode}
								onChange={onPostalCodeChange}
								placeholder={t("dialogs.personalInformation.postalCode")}
							/>
						</div>
					</div>
					<div className="flex flex-row gap-4 justify-between items-center">
						<div className="flex flex-col gap-1 w-full">
							<p className="text-sm text-muted-foreground">{t("dialogs.personalInformation.country")}</p>
							<Select onValueChange={onCountryChange}>
								<SelectTrigger>
									<SelectValue
										placeholder={inputs.country.length > 0 ? inputs.country : t("dialogs.personalInformation.country")}
									/>
								</SelectTrigger>
								<SelectContent>
									{countries.map(country => {
										return (
											<SelectItem
												value={country}
												key={country}
											>
												{country}
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={close}
						variant="outline"
					>
						{t("dialogs.personalInformation.close")}
					</Button>
					<Button
						onClick={save}
						variant="default"
					>
						{t("dialogs.personalInformation.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

export default ChangePersonalInformationDialog
