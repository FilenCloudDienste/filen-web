// @ts-check
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactCompiler from "eslint-plugin-react-compiler"
import pluginQuery from "@tanstack/eslint-plugin-query"
import globals from "globals"

export default tseslint.config(
	{
		// public/wsp.js is a vendored polyfill asset, not source.
		ignores: ["dist/**", "dev-dist/**", "node_modules/**", "public/wsp.js"]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...pluginQuery.configs["flat/recommended"],
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			},
			parserOptions: {
				ecmaFeatures: { jsx: true }
			}
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-compiler": reactCompiler
		},
		rules: {
			eqeqeq: "error",
			quotes: ["error", "double"],
			"no-mixed-spaces-and-tabs": "off",
			"no-duplicate-imports": "error",
			// react-hooks 7 ships an expanded "rules of React" preset; we keep the
			// project's established two rules here (modernize only) and can opt into
			// the rest as a separate strictness pass.
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"react-compiler/react-compiler": "error",
			// no-unstable-deps was newly added to @tanstack/query's recommended set (it was
			// not enabled in the version we previously ran); defer it to a separate strictness pass.
			"@tanstack/query/no-unstable-deps": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				}
			]
		}
	},
	{
		// tailwind.config.js is CommonJS by design (module.exports + require()).
		files: ["tailwind.config.js"],
		languageOptions: {
			sourceType: "commonjs",
			globals: { ...globals.node }
		},
		rules: {
			"@typescript-eslint/no-require-imports": "off"
		}
	}
)
