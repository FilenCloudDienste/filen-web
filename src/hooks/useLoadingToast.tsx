import { useToast, type ToasterToast } from "@/components/ui/use-toast"
import { Loader } from "lucide-react"
import { useCallback } from "react"

export type UseLoadingToast = () => {
	id: string
	dismiss: () => void
	update: (props: ToasterToast) => void
}

export default function useLoadingToast() {
	const { toast } = useToast()

	const show = useCallback(() => {
		return toast({
			description: (
				<Loader
					className="animate-spin-medium"
					size={18}
				/>
			),
			variant: "default",
			duration: Infinity
		})
	}, [toast])

	return show
}
