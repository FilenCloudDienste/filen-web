import { memo } from "react"

export const Header = memo(() => {
	return (
		<div className="flex flex-row px-3">
			<div className="flex flex-row w-full h-10 items-center select-none gap-3">
				<div className="flex flex-row grow min-w-[200px]">
					<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">Name</p>
				</div>
				<div className="flex flex-row w-[125px]">
					<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">Size</p>
				</div>
				<div className="flex flex-row w-[250px]">
					<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">Modified</p>
				</div>
			</div>
		</div>
	)
})

export default Header
