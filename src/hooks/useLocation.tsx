import { useRouterState } from "@tanstack/react-router"

export default function useLocation() {
	const location = useRouterState({
		select(state) {
			return state.location.pathname
		}
	})

	return location
}
