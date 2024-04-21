import { createFileRoute } from "@tanstack/react-router"
import { Chats } from "./chats"

export const Route = createFileRoute("/chats/$uuid")({
	component: Chats
})
