import { createContext, useContext, useLayoutEffect, useState } from "react"
import Cookies from "js-cookie"
import { IS_DESKTOP } from "@/constants"

export const STORAGE_KEY = "theme"
export const DEFAULT_THEME = "system"

export type Theme = "dark" | "light" | "system"

export type ThemeProviderProps = {
	children: React.ReactNode
}

export type ThemeProviderState = {
	theme: Theme
	systemTheme: Theme
	dark: boolean
	setTheme: (theme: Theme) => void
}

export const initialState: ThemeProviderState = {
	theme: DEFAULT_THEME,
	systemTheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
	dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
	setTheme: () => null
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function setThemeOnPageLoad(): void {
	const initialTheme = (IS_DESKTOP ? (localStorage.getItem(STORAGE_KEY) as Theme) : (Cookies.get(STORAGE_KEY) as Theme)) || DEFAULT_THEME
	const root = window.document.documentElement

	root.classList.remove("light", "dark")

	if (initialTheme === "system") {
		const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

		root.classList.add(systemTheme)

		return
	}

	root.classList.add(initialTheme)
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(
		() => (IS_DESKTOP ? (localStorage.getItem(STORAGE_KEY) as Theme) : (Cookies.get(STORAGE_KEY) as Theme)) || DEFAULT_THEME
	)

	useLayoutEffect(() => {
		const root = window.document.documentElement

		root.classList.remove("light", "dark")

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

			root.classList.add(systemTheme)

			return
		}

		root.classList.add(theme)
	}, [theme])

	const value: ThemeProviderState = {
		theme,
		systemTheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
		dark: theme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : theme === "dark",
		setTheme: (theme: Theme) => {
			if (IS_DESKTOP) {
				localStorage.setItem(STORAGE_KEY, theme)
			} else {
				Cookies.set(STORAGE_KEY, theme)
			}

			setTheme(theme)
		}
	}

	return (
		<ThemeProviderContext.Provider
			{...props}
			value={value}
		>
			{children}
		</ThemeProviderContext.Provider>
	)
}

export function useTheme() {
	const context = useContext(ThemeProviderContext)

	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider")
	}

	return context
}
