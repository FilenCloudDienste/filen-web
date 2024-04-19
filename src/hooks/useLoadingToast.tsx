import { useToast } from "@/components/ui/use-toast"
import { Loader } from "lucide-react"
import { useCallback } from "react"

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
			variant: "default"
		})
	}, [toast])

	return show
}
