import { useToast } from "@/components/ui/use-toast"
import Icon from "@/components/icon"
import { useCallback } from "react"

export default function useErrorToast() {
	const { toast } = useToast()

	const show = useCallback(
		(reason: string) => {
			return toast({
				description: (
					<div className="flex flex-row items-center gap-2">
						<Icon name="ban" />
						<p>{reason}</p>
					</div>
				),
				variant: "destructive"
			})
		},
		[toast]
	)

	return show
}
