import { defineConfig, normalizePath } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { TanStackRouterVite } from "@tanstack/router-vite-plugin"
import { comlink } from "vite-plugin-comlink"
import i18nextLoader from "vite-plugin-i18next-loader"
import svgr from "vite-plugin-svgr"
import topLevelAwait from "vite-plugin-top-level-await"
import checker from "vite-plugin-checker"
import { VitePWA } from "vite-plugin-pwa"
import { createRequire } from "node:module"
import { viteStaticCopy } from "vite-plugin-static-copy"

const now = Date.now()
const require = createRequire(import.meta.url)
const pdfjsDistPath = path.dirname(require.resolve("pdfjs-dist/package.json"))
const pdfjsCMapsDir = normalizePath(path.join(pdfjsDistPath, "cmaps"))
const pdfjsStandardFontsDir = normalizePath(path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts"))

export default defineConfig({
	base: "/",
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
		topLevelAwait({
			promiseExportName: "__tla",
			promiseImportName: i => `__tla_${i}`
		}),
		TanStackRouterVite(),
		react({
			babel: {
				plugins: [
					[
						"babel-plugin-react-compiler",
						{
							target: "18"
						}
					]
				]
			},
			jsxImportSource: "@welldone-software/why-did-you-render"
		}),
		comlink(),
		i18nextLoader({
			paths: ["./locales"]
		}),
		svgr(),
		VitePWA({
			srcDir: "src",
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
					vite: [
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
						topLevelAwait({
							promiseExportName: "__tla",
							promiseImportName: i => `__tla_${i}`
						})
					]
				}
			},
			devOptions: {
				enabled: true
			}
		}),
		checker({
			typescript: true
		})
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	},
	worker: {
		format: "es",
		plugins: () => [
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
			topLevelAwait({
				promiseExportName: "__tla",
				promiseImportName: i => `__tla_${i}`
			}),
			comlink()
		]
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
