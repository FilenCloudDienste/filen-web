import { defineConfig, normalizePath } from "vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { resolve, join, dirname } from "node:path"
import { comlink } from "vite-plugin-comlink"
import checker from "vite-plugin-checker"
import topLevelAwait from "vite-plugin-top-level-await"
import { createRequire } from "node:module"
import { viteStaticCopy } from "vite-plugin-static-copy"
import { VitePWA } from "vite-plugin-pwa"

export const now = Date.now()
export const require = createRequire(import.meta.url)
export const pdfjsDistPath = dirname(require.resolve("pdfjs-dist/package.json"))
export const pdfjsCMapsDir = normalizePath(join(pdfjsDistPath, "cmaps"))
export const pdfjsStandardFontsDir = normalizePath(join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts"))

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

export const tla = topLevelAwait({
	promiseExportName: "__tla",
	promiseImportName: i => `__tla_${i}`
})

export default defineConfig({
	plugins: [
		viteStaticCopy({
			targets: [
				{
					src: pdfjsCMapsDir,
					dest: "pdfjs/"
				}
			]
		}),
		viteStaticCopy({
			targets: [
				{
					src: pdfjsStandardFontsDir,
					dest: "pdfjs/"
				}
			]
		}),
		nodePoly,
		tla,
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
		VitePWA({
			srcDir: "src/lib",
			filename: "sw.ts",
			strategies: "injectManifest",
			workbox: {
				maximumFileSizeToCacheInBytes: Infinity
			},
			injectRegister: false,
			manifest: false,
			injectManifest: {
				injectionPoint: undefined,
				rollupFormat: "iife",
				minify: true,
				sourcemap: true,
				buildPlugins: {
					vite: [nodePoly]
				}
			},
			devOptions: {
				enabled: false
			}
		}),
		checker({
			typescript: true
		})
	],
	worker: {
		format: "iife",
		plugins: () => [nodePoly, tla, comlink()]
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
