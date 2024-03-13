import { memo } from "react"
import { useRouterState } from "@tanstack/react-router"
import Item from "./item"

export const Breadcrumb = memo(() => {
	const routerState = useRouterState()

	return (
		<div className="fixed flex flex-row h-12 items-center text-nowrap line-clamp-1 w-[999999999px] gap-1 dragselect-start-allowed">
			{routerState.location.pathname.split("/").map((path, index) => (
				<Item
					key={index}
					path={path}
					index={index}
					pathname={routerState.location.pathname}
				/>
			))}
		</div>
	)
})

export default Breadcrumb
