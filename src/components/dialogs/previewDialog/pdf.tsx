import { memo } from "react"

export const PDF = memo(({ urlObject }: { urlObject: string }) => {
	return (
		<div className="w-full h-full bg-black">
			<iframe
				src={urlObject}
				className="w-full h-full"
			/>
		</div>
	)
})

export default PDF
