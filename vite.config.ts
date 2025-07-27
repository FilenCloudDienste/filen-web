import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { resolve } from "node:path"
import { comlink } from "vite-plugin-comlink"
import checker from "vite-plugin-checker"

export const now = Date.now()

export const nodePoly = nodePolyfills({
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
})

export default defineConfig({
	plugins: [
		nodePoly,
		tanstackRouter({
			autoCodeSplitting: true,
			target: "react",
			semicolons: false
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"]
			}
		}),
		tailwindcss(),
		comlink(),
		checker({
			typescript: true
		})
	],
	worker: {
		format: "iife",
		plugins: () => [nodePoly, comlink()]
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src")
		}
	},
	build: {
		sourcemap: true,
		rollupOptions: {
			output: {
				chunkFileNames() {
					return `[name].[hash].${now}.js`
				},
				entryFileNames() {
					return `[name].${now}.js`
				},
				assetFileNames() {
					return `assets/[name]-[hash].${now}[extname]`
				}
			}
		}
	}
})
