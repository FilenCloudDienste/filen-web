module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@tanstack/eslint-plugin-query/recommended",
		"plugin:@tanstack/eslint-plugin-query/recommended"
	],
	ignorePatterns: ["dist", ".eslintrc.cjs"],
	parser: "@typescript-eslint/parser",
	//plugins: ["react-refresh"],
	rules: {
		//"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
		eqeqeq: 2,
		quotes: ["error", "double"],
		"no-mixed-spaces-and-tabs": 0,
		"no-duplicate-imports": "error"
	}
}
