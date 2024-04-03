import { memo, useMemo } from "react"
import useLocation from "@/hooks/useLocation"
import Item from "./item"

export const Breadcrumbs = memo(() => {
	const location = useLocation()

	const components = useMemo(() => {
		return location.split("/")
	}, [location])

	return (
		<div className="flex flex-row items-center px-3 h-full overflow-hidden dragselect-start-allowed">
			<div className="flex flex-row h-6 items-center flex-wrap gap-1 dragselect-start-allowed overflow-hidden">
				{components.map((path, index) => (
					<Item
						key={index}
						path={path}
						index={index}
						pathname={location}
					/>
				))}
			</div>
		</div>
	)
})

export default Breadcrumbs
