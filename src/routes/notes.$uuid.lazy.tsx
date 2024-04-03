import { createLazyFileRoute } from "@tanstack/react-router"
import { Notes } from "./notes.lazy"

export const Route = createLazyFileRoute("/notes/$uuid")({
	component: Notes
})
