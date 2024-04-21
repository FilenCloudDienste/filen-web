import { createFileRoute } from "@tanstack/react-router"
import Drive from "@/components/drive"

export const Route = createFileRoute("/drive/$")({
	component: Drive
})
