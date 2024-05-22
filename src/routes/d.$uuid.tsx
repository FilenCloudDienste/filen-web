import { createFileRoute } from "@tanstack/react-router"
import FileComponent from "@/components/publicLink/file"

export const Route = createFileRoute("/d/$uuid")({
	component: File
})

export function File() {
	return <FileComponent />
}
