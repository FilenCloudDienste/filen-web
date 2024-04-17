import { useToast } from "@/components/ui/use-toast"
import Icon from "@/components/icon"
import { useCallback } from "react"

export default function useSuccessToast() {
	const { toast } = useToast()

	const show = useCallback(
		(message: string) => {
			return toast({
				description: (
					<div className="flex flex-row items-center gap-4">
						<Icon
							name="check-circle"
							size={18}
						/>
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
