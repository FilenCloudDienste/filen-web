import { useLocalStorage } from "@uidotdev/usehooks"
import { FilenDesktopConfig } from "@filen/desktop/dist/types"
import { DEFAULT_DESKTOP_CONFIG } from "@/lib/setup"

export default function useDesktopConfig() {
	const desktopConfig = useLocalStorage<FilenDesktopConfig>("desktopConfig", DEFAULT_DESKTOP_CONFIG)

	return desktopConfig
}
