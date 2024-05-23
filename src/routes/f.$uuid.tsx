import { createFileRoute } from "@tanstack/react-router"
import DirectoryComponent from "@/components/publicLink/directory"

export const Route = createFileRoute("/f/$uuid")({
	component: Directory
})

export function Directory() {
	return <DirectoryComponent />
}
