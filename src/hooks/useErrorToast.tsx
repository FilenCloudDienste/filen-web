import { useToast, type ToasterToast } from "@/components/ui/use-toast"
import { Ban } from "lucide-react"
import { useCallback } from "react"

export type UseErrorToast = (reason: string) => {
	id: string
	dismiss: () => void
	update: (props: ToasterToast) => void
}

export default function useErrorToast() {
	const { toast } = useToast()

	const show = useCallback(
		(reason: string, duration: number = 5000) => {
			const t = toast({
				description: (
					<div className="flex flex-row items-center gap-2">
						<Ban
							size={18}
							className="shrink-0"
						/>
						<p>{reason}</p>
					</div>
				),
				variant: "destructive"
			})

			t.update({
				id: t.id,
				duration
			})

			return t
		},
		[toast]
	)

	return show
}
