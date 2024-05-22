import { useRouterState } from "@tanstack/react-router"

export default function useLocation() {
	const hash = useRouterState({
		select(state) {
			return state.location.hash
		}
	})

	return hash
}
