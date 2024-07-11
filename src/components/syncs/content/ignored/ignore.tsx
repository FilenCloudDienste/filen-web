import { memo } from "react"
import { type IgnoreType } from "./index"

export const Ignore = memo(({ ignore }: { ignore: IgnoreType }) => {
	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 gap-2 hover:bg-secondary hover:rounded-sm">
				<p>
					{ignore.localPath} {ignore.reason}
				</p>
			</div>
		</div>
	)
})

export default Ignore
