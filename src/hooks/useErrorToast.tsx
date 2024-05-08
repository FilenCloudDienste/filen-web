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
		(reason: string) => {
			return toast({
				description: (
					<div className="flex flex-row items-center gap-2">
						<Ban size={18} />
						<p className="line-clamp-1 text-ellipsis break-all">{reason}</p>
					</div>
				),
				variant: "destructive"
			})
		},
		[toast]
	)

	return show
}
