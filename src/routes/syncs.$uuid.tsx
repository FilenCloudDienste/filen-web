import { createFileRoute } from "@tanstack/react-router"
import { Syncs } from "./syncs"

export const Route = createFileRoute("/syncs/$uuid")({
	component: Syncs
})
