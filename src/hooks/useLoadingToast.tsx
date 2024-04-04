import { useToast } from "@/components/ui/use-toast"
import Icon from "@/components/icon"
import { useCallback } from "react"

export default function useLoadingToast() {
	const { toast } = useToast()

	const show = useCallback(() => {
		return toast({
			description: (
				<Icon
					name="loader"
					className="animate-spin-medium"
				/>
			),
			variant: "default"
		})
	}, [toast])

	return show
}
