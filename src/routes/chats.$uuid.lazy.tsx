import { createLazyFileRoute } from "@tanstack/react-router"
import { Chats } from "./chats.lazy"

export const Route = createLazyFileRoute("/chats/$uuid")({
	component: Chats
})
