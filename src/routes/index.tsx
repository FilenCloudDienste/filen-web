import { createFileRoute, useNavigate } from "@tanstack/react-router"
import useMountedEffect from "@/hooks/useMountedEffect"

export const Route = createFileRoute("/")({
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
