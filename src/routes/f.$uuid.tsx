import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/f/$uuid")({
	component: () => <>f</>
})
