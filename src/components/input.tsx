import { memo, forwardRef, useCallback, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { Search, EyeOff, Eye, X } from "lucide-react"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	withSearchIcon?: boolean
	withPasswordToggleIcon?: boolean
	withClearIcon?: boolean
	onPasswordToggle?: () => void
	onClear?: () => void
	clearOnEscape?: boolean
}

export const Input = memo(
	forwardRef<HTMLInputElement, InputProps>(
		(
			{
				className,
				type,
				withSearchIcon,
				withPasswordToggleIcon,
				withClearIcon,
				onPasswordToggle,
				onClear,
				clearOnEscape = true,
				...props
			},
			ref
		) => {
			const onKeyDown = useCallback(
				(e: React.KeyboardEvent<HTMLInputElement>) => {
					if (e.key !== "Escape" || !onClear || !clearOnEscape) {
						return
					}

					onClear()
				},
				[onClear, clearOnEscape]
			)

			return (
				<div className="w-full relative">
					<input
						type={type}
						className={cn(
							"peer flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
							withSearchIcon ? "pl-9" : "",
							withPasswordToggleIcon || withClearIcon ? "pr-9" : "",
							className
						)}
						ref={ref}
						onKeyDown={onKeyDown}
						{...props}
					/>
					{withSearchIcon && (
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary" />
					)}
					{withClearIcon && props.value && props.value.toString().length > 0 && (
						<X
							className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary cursor-pointer"
							onClick={onClear}
						/>
					)}
					{withPasswordToggleIcon && (
						<>
							{type === "password" ? (
								<Eye
									className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary cursor-pointer hover:text-primary"
									onClick={onPasswordToggle}
								/>
							) : (
								<EyeOff
									className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground peer-focus:text-primary cursor-pointer hover:text-primary"
									onClick={onPasswordToggle}
								/>
							)}
						</>
					)}
				</div>
			)
		}
	)
)

export default Input
