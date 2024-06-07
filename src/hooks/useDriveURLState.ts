import { useMemo } from "react"
import useLocation from "./useLocation"
import useRouteParent from "./useRouteParent"
import { validate as validateUUID } from "uuid"

export default function useDriveURLState() {
	const location = useLocation()
	const parent = useRouteParent()

	const urlState = useMemo(() => {
		return {
			drive: location.includes("drive"),
			trash: location.includes("trash"),
			recents: location.includes("recents"),
			favorites: location.includes("favorites"),
			sharedIn: location.includes("shared-in"),
			sharedOut: location.includes("shared-out"),
			links: location.includes("links"),
			insideParent: parent.length === 36 && validateUUID(parent),
			publicLink: location.includes("/d/") || location.includes("/f/")
		}
	}, [location, parent])

	return urlState
}
