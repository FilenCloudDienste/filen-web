import { memo, useCallback } from "react"
import { IS_DESKTOP } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"
import useIsMobile from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"

export type CookieConsentValues = "full" | "needed" | "undecided"

export const CookieConsent = memo(({ children }: { children: React.ReactNode }) => {
	const [cookieConsent, setCookieConsent] = useLocalStorage<CookieConsentValues>("cookieConsent", "undecided")
	const { t } = useTranslation()
	const isMobile = useIsMobile()

	const accept = useCallback(() => {
		setCookieConsent("full")
	}, [setCookieConsent])

	const onlyNeeded = useCallback(() => {
		setCookieConsent("needed")
	}, [setCookieConsent])

	return (
		<>
			{!IS_DESKTOP && cookieConsent !== "needed" && cookieConsent !== "full" && (
				<div className={cn("z-50 flex flex-row absolute bottom-4", !isMobile ? "right-4" : "w-full px-4")}>
					<div className="flex flex-row gap-4 p-4 bg-background border rounded-sm">
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
				</div>
			)}
			{children}
		</>
	)
})

export default CookieConsent
