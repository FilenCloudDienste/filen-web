import { createLazyFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createLazyFileRoute("/")({
	component: Index
})

export function Index() {
	const navigate = useNavigate()

	useEffect(() => {
		navigate({
			to: "/login",
			replace: true,
			resetScroll: true
		})
	}, [navigate])

	return null
}
