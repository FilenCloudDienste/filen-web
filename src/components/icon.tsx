import { lazy, Suspense, memo } from "react"
import { type LucideProps, type LucideIcon } from "lucide-react"
import dynamicIconImports from "lucide-react/dynamicIconImports"
import { memoize } from "lodash"

interface IconProps extends Omit<LucideProps, "ref"> {
	name: keyof typeof dynamicIconImports
}

export const getIcon = memoize((name: keyof typeof dynamicIconImports): React.LazyExoticComponent<LucideIcon> => {
	return lazy(dynamicIconImports[name])
})

export const Icon = memo(({ name, ...props }: IconProps) => {
	const LucideIcon = getIcon(name)

	return (
		<Suspense
			fallback={
				<div
					className="bg-secondary rounded-lg animate-pulse"
					style={{ width: props.size ? props.size : 24, height: props.size ? props.size : 24 }}
				/>
			}
		>
			<LucideIcon {...props} />
		</Suspense>
	)
})

export default Icon
