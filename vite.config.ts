import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { TanStackRouterVite } from "@tanstack/router-vite-plugin"

export default defineConfig({
	plugins: [
		react(),
		nodePolyfills({
			overrides: {
				// Since `fs` is not supported in browsers, we can use the `memfs` package to polyfill it.
				fs: "memfs"
			},
			// Whether to polyfill `node:` protocol imports.
			protocolImports: true
		}),
		TanStackRouterVite()
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	}
})
