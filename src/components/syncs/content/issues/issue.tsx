import { memo } from "react"
import { type GeneralError } from "@/stores/syncs.store"

export const Issue = memo(({ error }: { error: GeneralError }) => {
	return (
		<div className="flex flex-row items-center px-4">
			<div className="flex flex-row items-center border-b w-full p-2.5 py-3 gap-2 hover:bg-secondary hover:rounded-sm">
				<p>{error.error.message}</p>
			</div>
		</div>
	)
})

export default Issue
