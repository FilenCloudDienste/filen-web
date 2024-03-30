import { memo } from "react"

export const Video = memo(({ urlObject }: { urlObject: string }) => {
	return (
		<div className="w-full h-full bg-black">
			<video
				controls={true}
				autoPlay={true}
				src={urlObject}
				className="w-full h-[calc(100vh-48px)] object-contain"
			/>
		</div>
	)
})

export default Video
