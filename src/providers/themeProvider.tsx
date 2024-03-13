import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"

export type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: Theme
	storageKey?: string
}

export type ThemeProviderState = {
	theme: Theme
	systemTheme: Theme
	setTheme: (theme: Theme) => void
}

export const initialState: ThemeProviderState = {
	theme: "system",
	systemTheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
	setTheme: () => null
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "theme", ...props }: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme)

	useEffect(() => {
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
		setTheme: (theme: Theme) => {
			localStorage.setItem(storageKey, theme)

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
