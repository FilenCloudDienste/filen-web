import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { resolve } from "node:path"

export default defineConfig({
	plugins: [
		nodePolyfills({
			include: [],
			overrides: {
				fs: "memfs"
			},
			globals: {
				Buffer: true,
				global: true,
				process: true
			},
			protocolImports: true
		}),
		TanStackRouterVite({
			autoCodeSplitting: true
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"]
			}
		}),
		tailwindcss()
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src")
		}
	}
})
