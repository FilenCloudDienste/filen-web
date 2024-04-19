import { memo, useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

export const Avatar = memo(
	({
		src,
		fallback,
		className,
		status
	}: {
		src: string
		fallback: string
		className?: string
		status?: "online" | "away" | "busy" | "offline"
	}) => {
		const [useFallback, setUseFallback] = useState<boolean>(false)
		const ref = useRef<HTMLDivElement>(null)

		const onError = useCallback(() => {
			setUseFallback(true)
		}, [])

		return (
			<div
				ref={ref}
				className={cn("flex flex-row shrink-0", className ? className : "w-8 h-8")}
			>
				{useFallback ? (
					<p>{fallback.slice(0, 1).toUpperCase()}</p>
				) : (
					<img
						src={src}
						className="w-full h-full object-contain rounded-full"
						onError={onError}
					/>
				)}
				{status && (
					<div
						className={cn(
							"absolute z-50 w-3 h-3 rounded-full",
							status === "online" && "bg-green-500",
							status === "offline" && "bg-gray-500",
							status === "busy" && "bg-red-500",
							status === "away" && "bg-yellow-500"
						)}
						style={{
							marginTop: (ref.current?.getBoundingClientRect().height ?? 32) / 1.4,
							marginLeft: (ref.current?.getBoundingClientRect().width ?? 32) / 1.4
						}}
					/>
				)}
			</div>
		)
	}
)

export default Avatar
