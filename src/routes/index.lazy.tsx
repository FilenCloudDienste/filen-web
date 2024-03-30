import { createLazyFileRoute, useNavigate } from "@tanstack/react-router"
import useMountedEffect from "@/hooks/useMountedEffect"

export const Route = createLazyFileRoute("/")({
	component: Index
})

export function Index() {
	const navigate = useNavigate()

	useMountedEffect(() => {
		navigate({
			to: "/login",
			replace: true,
			resetScroll: true
		})
	})

	return null
}
