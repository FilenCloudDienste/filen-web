import { DESKTOP_CONFIG_VERSION, SDK_CONFIG_VERSION, IS_DESKTOP, AUTHED_VERSION } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"

export const localStorageKey = IS_DESKTOP
	? `authed:${AUTHED_VERSION}:${DESKTOP_CONFIG_VERSION}:${SDK_CONFIG_VERSION}`
	: `authed:${AUTHED_VERSION}:${SDK_CONFIG_VERSION}`

export default function useIsAuthed(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
	const [authed, setAuthed] = useLocalStorage<boolean>(localStorageKey, false)

	return [authed, setAuthed]
}
