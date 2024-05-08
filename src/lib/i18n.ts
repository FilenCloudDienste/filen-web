import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import locales from "virtual:i18next-loader"

const storedLang = localStorage.getItem("lang")

i18n.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: {
				translation: locales.en
			},
			de: {
				translation: locales.de
			}
		},
		lng: storedLang ?? undefined,
		debug: true,
		fallbackLng: "en",
		interpolation: {
			escapeValue: false
		}
	})

export default i18n
