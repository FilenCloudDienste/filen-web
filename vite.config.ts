import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { TanStackRouterVite } from "@tanstack/router-vite-plugin"
import { comlink } from "vite-plugin-comlink"
import i18nextLoader from "vite-plugin-i18next-loader"

export default defineConfig({
	plugins: [
		react(),
		nodePolyfills({
			overrides: {
				fs: "memfs"
			},
			protocolImports: true
		}),
		TanStackRouterVite(),
		comlink(),
		i18nextLoader({ paths: ["./locales"] })
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	},
	worker: {
		plugins: () => [comlink()]
	}
})
