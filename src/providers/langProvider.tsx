import { createContext, useContext, useState } from "react"
import { usePreferredLanguage } from "@uidotdev/usehooks"

export type Lang = string

export type LangProviderProps = {
	children: React.ReactNode
	storageKey?: string
}

export type LangProviderState = {
	lang: Lang
	setLang: (lang: Lang) => void
}

export const initialState: LangProviderState = {
	lang: "en",
	setLang: () => null
}

export const LangProviderContext = createContext<LangProviderState>(initialState)

export function LangProvider({ children, storageKey = "lang", ...props }: LangProviderProps) {
	const preferredLanguage = usePreferredLanguage().split("-")[0]
	const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(storageKey) as Lang) || preferredLanguage)

	const value = {
		lang,
		setLang: (lang: Lang) => {
			localStorage.setItem(storageKey, lang)

			setLang(lang)
		}
	}

	return (
		<LangProviderContext.Provider
			{...props}
			value={value}
		>
			{children}
		</LangProviderContext.Provider>
	)
}

export function useLang() {
	const context = useContext(LangProviderContext)

	if (!context) {
		throw new Error("useLang must be used within a LangProvider")
	}

	return context
}
