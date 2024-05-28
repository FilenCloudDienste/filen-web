import { memo, useEffect, useCallback, useRef } from "react"
import { IS_DESKTOP } from "@/constants"
import { useToast } from "./ui/use-toast"
import { useLocalStorage } from "@uidotdev/usehooks"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"

export type CookieConsentValues = "full" | "needed" | "undecided"

export const CookieConsent = memo(({ children }: { children: React.ReactNode }) => {
	const { toast } = useToast()
	const [cookieConsent, setCookieConsent] = useLocalStorage<CookieConsentValues>("cookieConsent", "undecided")
	const { t } = useTranslation()
	const toastRef = useRef<ReturnType<typeof toast> | null>(null)

	const accept = useCallback(() => {
		if (toastRef.current) {
			toastRef.current.dismiss()

			setCookieConsent("full")
		}
	}, [setCookieConsent])

	const onlyNeeded = useCallback(() => {
		if (toastRef.current) {
			toastRef.current.dismiss()

			setCookieConsent("needed")
		}
	}, [setCookieConsent])

	const showConsent = useCallback(() => {
		if (IS_DESKTOP || cookieConsent !== "undecided" || toastRef.current) {
			return
		}

		toastRef.current = toast({
			duration: Infinity,
			description: t("cookieConsent.description"),
			action: (
				<div className="flex flex-col gap-2">
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
			)
		})
	}, [cookieConsent, toast, t, onlyNeeded, accept])

	useEffect(() => {
		if (!IS_DESKTOP) {
			showConsent()
		}
	}, [showConsent])

	return children
})

export default CookieConsent
