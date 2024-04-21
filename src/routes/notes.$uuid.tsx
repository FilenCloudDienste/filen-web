import { createFileRoute } from "@tanstack/react-router"
import { Notes } from "./notes"

export const Route = createFileRoute("/notes/$uuid")({
	component: Notes
})
