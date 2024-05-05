import { memo, useMemo } from "react"
import Item from "./item"

export const Breadcrumbs = memo(
	({ pathname, setPathname }: { pathname: string; setPathname: React.Dispatch<React.SetStateAction<string>> }) => {
		const components = useMemo(() => {
			return pathname.split("/")
		}, [pathname])

		return (
			<div className="flex flex-row w-full h-5 items-center overflow-hidden select-none">
				<div className="flex flex-row h-5 w-full select-none flex-wrap">
					{components.map((uuid, index) => {
						return (
							<Item
								key={uuid}
								uuid={uuid}
								setPathname={setPathname}
								components={components}
								index={index}
								pathname={pathname}
							/>
						)
					})}
				</div>
			</div>
		)
	}
)

export default Breadcrumbs
