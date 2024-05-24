import useLocation from "./useLocation"
import { useMemo } from "react"

export default function useRouteParent() {
	const location = useLocation()

	const routeParent = useMemo(() => {
		if (location.includes("/")) {
			const ex = location.split("/")
			const part = ex[ex.length - 1]

			if (!part) {
				return location
			}

			return part
		}

		return location
	}, [location])

	return routeParent
}
