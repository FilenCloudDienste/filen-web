import { createLazyFileRoute } from "@tanstack/react-router"
import Drive from "@/components/drive"

export const Route = createLazyFileRoute("/drive/$")({
	component: Drive
})
