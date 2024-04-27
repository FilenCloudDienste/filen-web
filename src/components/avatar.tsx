import { memo, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

export const Avatar = memo(
	({
		src,
		fallback,
		className,
		status,
		size
	}: {
		src?: string | null
		fallback?: string | null
		className?: string
		status?: "online" | "away" | "busy" | "offline"
		size: number
	}) => {
		const [useFallback, setUseFallback] = useState<boolean>(false)

		const onError = useCallback(() => {
			setUseFallback(true)
		}, [])

		return (
			<div
				className={cn("flex flex-row shrink-0", className)}
				style={{
					width: size ? size : 32,
					height: size ? size : 32
				}}
			>
				<img
					src={!src ? "/img/fallbackAvatar.webp" : useFallback ? (fallback ? fallback : "/img/fallbackAvatar.webp") : src}
					className="w-full h-full object-contain rounded-full"
					onError={onError}
				/>
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
							marginTop: size / 1.4,
							marginLeft: size / 1.4
						}}
					/>
				)}
			</div>
		)
	}
)

export default Avatar
