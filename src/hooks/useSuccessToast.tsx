import { useToast, type ToasterToast } from "@/components/ui/use-toast"
import { CheckCircle } from "lucide-react"
import { useCallback } from "react"

export type UseSuccessToast = (message: string) => {
	id: string
	dismiss: () => void
	update: (props: ToasterToast) => void
}

export default function useSuccessToast() {
	const { toast } = useToast()

	const show = useCallback(
		(message: string) => {
			return toast({
				description: (
					<div className="flex flex-row items-center gap-4">
						<CheckCircle size={18} />
						<p className="line-clamp-1 text-ellipsis break-all">{message}</p>
					</div>
				),
				variant: "default"
			})
		},
		[toast]
	)

	return show
}
