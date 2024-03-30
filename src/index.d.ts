import { type DesktopAPI } from "@filen/desktop"

declare global {
	interface Window {
		desktopAPI: DesktopAPI
	}
}
