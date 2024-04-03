import useLocation from "./useLocation"
import { useMemo } from "react"

export default function useRouteParent() {
	const location = useLocation()

	const routeParent = useMemo(() => {
		if (location.includes("/")) {
			const ex = location.split("/")

			return ex[ex.length - 1]
		}

		return location
	}, [location])

	return routeParent
}
