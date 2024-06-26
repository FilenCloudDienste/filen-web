import useDriveURLState from "./useDriveURLState"
import useLocation from "./useLocation"
import useRouteParent from "./useRouteParent"
import { useMemo } from "react"
import { validate as validateUUID } from "uuid"

export default function useCanUpload() {
	const driveURLState = useDriveURLState()
	const location = useLocation()
	const routeParent = useRouteParent()

	const canUpload = useMemo(() => {
		if (location.includes("chats") && validateUUID(routeParent)) {
			return true
		}

		if (location.includes("favorites") && validateUUID(routeParent)) {
			return true
		}

		if (location.includes("shared-out") && validateUUID(routeParent)) {
			return true
		}

		if (location.includes("links") && validateUUID(routeParent)) {
			return true
		}

		return (
			!driveURLState.favorites &&
			!driveURLState.links &&
			!driveURLState.recents &&
			!driveURLState.sharedIn &&
			!driveURLState.sharedOut &&
			!driveURLState.trash &&
			location.includes("/drive")
		)
	}, [driveURLState, location, routeParent])

	return canUpload
}
