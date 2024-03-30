import { memo, useMemo } from "react"
import { useRouterState } from "@tanstack/react-router"
import Item from "./item"

export const Breadcrumbs = memo(() => {
	const routerState = useRouterState()

	const components = useMemo(() => {
		return routerState.location.pathname.split("/")
	}, [routerState.location.pathname])

	return (
		<div className="flex flex-row items-center px-3 h-full overflow-hidden dragselect-start-allowed">
			<div className="flex flex-row h-6 items-center flex-wrap gap-1 dragselect-start-allowed overflow-hidden">
				{components.map((path, index) => (
					<Item
						key={index}
						path={path}
						index={index}
						pathname={routerState.location.pathname}
					/>
				))}
			</div>
		</div>
	)
})

export default Breadcrumbs
