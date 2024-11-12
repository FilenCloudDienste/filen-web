import { DESKTOP_CONFIG_VERSION, SDK_CONFIG_VERSION, AUTHED_VERSION } from "@/constants"
import { useLocalStorage } from "@uidotdev/usehooks"

export const localStorageKey = `authed:${AUTHED_VERSION}:${DESKTOP_CONFIG_VERSION}:${SDK_CONFIG_VERSION}`

export default function useIsAuthed(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
	const [authed, setAuthed] = useLocalStorage<boolean>(localStorageKey, false)

	return [authed, setAuthed]
}
