import { createContext, useContext, useEffect, useState, memo, useMemo } from "react"

export type Theme = "dark" | "light" | "system"

export type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: Theme
	storageKey?: string
}

export type ThemeProviderState = {
	theme: Theme
	setTheme: (theme: Theme) => void
}

export const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export const ThemeProvider = memo(({ children, defaultTheme = "system", storageKey = "vite-ui-theme", ...props }: ThemeProviderProps) => {
	const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme)

	const value = useMemo(
		() => ({
			theme,
			setTheme: (theme: Theme) => {
				localStorage.setItem(storageKey, theme)

				setTheme(theme)
			}
		}),
		[theme, storageKey]
	)

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

	return (
		<ThemeProviderContext.Provider
			{...props}
			value={value}
		>
			{children}
		</ThemeProviderContext.Provider>
	)
})

ThemeProvider.displayName = "ThemeProvider"

export function useTheme(): ThemeProviderState {
	const context = useContext(ThemeProviderContext)

	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider")
	}

	return context
}
