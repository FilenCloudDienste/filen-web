/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('tailwindcss').Config} */

module.exports = {
	darkMode: ["class"],
	content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px"
			}
		},
		extend: {
			fontFamily: {
				geist: ["Geist", "Regular"],
				inter: ["Inter", "Regular"]
			},
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))"
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))"
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))"
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))"
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))"
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))"
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))"
				}
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)"
			},
			fontSize: {
				xs: ["0.6375rem", { lineHeight: "0.85rem" }], // 10.2px
				sm: ["0.85rem", { lineHeight: "1.133rem" }], // 13.6px
				base: ["1.02rem", { lineHeight: "1.36rem" }], // 16.32px
				lg: ["1.19rem", { lineHeight: "1.59rem" }], // 19.04px
				xl: ["1.275rem", { lineHeight: "1.78rem" }], // 20.4px
				"2xl": ["1.53rem", { lineHeight: "2.04rem" }], // 24.48px
				"3xl": ["1.955rem", { lineHeight: "2.34rem" }], // 31.28px
				"4xl": ["2.295rem", { lineHeight: "2.55rem" }], // 36.72px
				"5xl": ["3.06rem", { lineHeight: "1" }], // 48.96px
				"6xl": ["3.825rem", { lineHeight: "1" }], // 61.2px
				"7xl": ["4.59rem", { lineHeight: "1" }], // 73.44px
				"8xl": ["6.12rem", { lineHeight: "1" }], // 97.92px
				"9xl": ["8.16rem", { lineHeight: "1" }] // 130.56px
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" }
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" }
				},
				"caret-blink": {
					"0%,70%,100%": { opacity: "1" },
					"20%,50%": { opacity: "0" }
				}
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"caret-blink": "caret-blink 1.25s ease-out infinite",
				"spin-slow": "spin 3s linear infinite",
				"spin-medium": "spin 2s linear infinite"
			}
		}
	},
	// eslint-disable-next-line no-undef
	plugins: [require("tailwindcss-animate")]
}
