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
				<div className="flex flex-row items-center justify-center w-full h-auto">
					<Loader
						className="animate-spin-medium"
						size={18}
					/>
				</div>
			),
			variant: "default",
			duration: Infinity
		})
	}, [toast])

	return show
}
