import { memo, useCallback } from "react"
import { IS_DESKTOP } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"

export type CookieConsentValues = "full" | "needed" | "undecided"

export const CookieConsent = memo(({ children }: { children: React.ReactNode }) => {
	const [cookieConsent, setCookieConsent] = useLocalStorage<CookieConsentValues>("cookieConsent", "undecided")
	const { t } = useTranslation()

	const accept = useCallback(() => {
		setCookieConsent("full")
	}, [setCookieConsent])

	const onlyNeeded = useCallback(() => {
		setCookieConsent("needed")
	}, [setCookieConsent])

	if (IS_DESKTOP || cookieConsent === "needed" || cookieConsent === "full") {
		return children
	}

	return (
		<>
			<div className="z-50 flex flex-row bg-background border rounded-sm absolute bottom-4 right-4 p-4 gap-4">
				<div className="flex flex-row max-w-72">
					<p>{t("cookieConsent.description")}</p>
				</div>
				<div className="flex flex-col gap-2 justify-center">
					<Button
						size="sm"
						variant="outline"
						onClick={onlyNeeded}
					>
						{t("cookieConsent.onlyNeeded")}
					</Button>
					<Button
						size="sm"
						onClick={accept}
					>
						{t("cookieConsent.accept")}
					</Button>
				</div>
			</div>
			{children}
		</>
	)
})

export default CookieConsent
