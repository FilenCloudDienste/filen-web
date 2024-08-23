import { useToast, type ToasterToast } from "@/components/ui/use-toast"
import { Loader } from "lucide-react"
import { useCallback, memo } from "react"

export type UseLoadingToast = () => {
	id: string
	dismiss: () => void
	update: (props: ToasterToast) => void
}

export const LoadingToastContent = memo(({ text }: { text?: string }) => {
	return (
		<div className="flex flex-row items-center justify-center w-full h-auto gap-2">
			<Loader
				className="animate-spin-medium"
				size={18}
			/>
			{typeof text === "string" && <p>{text}</p>}
		</div>
	)
})

export default function useLoadingToast() {
	const { toast } = useToast()

	const show = useCallback(() => {
		return toast({
			description: <LoadingToastContent />,
			variant: "default",
			duration: Infinity
		})
	}, [toast])

	return show
}
