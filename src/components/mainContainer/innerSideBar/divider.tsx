import { memo } from "react"

export const Divider = memo(() => {
	return <div className="w-full h-[1px] bg-border mt-2 mb-3 flex-shrink-0" />
})

export default Divider
