import { memo } from "react"

export const Header = memo(() => {
	return (
		<div className="flex flex-row px-3">
			<div className="flex flex-row w-full h-10 items-center select-none">
				<div className="flex flex-row grow">
					<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">Name</p>
				</div>
				<div className="flex flex-row shrink-0 w-[150px]">
					<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">Size</p>
				</div>
				<div className="flex flex-row shrink-0 w-[220px]">
					<p className="dragselect-start-disallowed line-clamp-1 text-ellipsis">Modified</p>
				</div>
			</div>
		</div>
	)
})

export default Header
