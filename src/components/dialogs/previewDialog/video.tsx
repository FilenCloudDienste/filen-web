import { memo } from "react"
import { cn } from "@/lib/utils"

export const Video = memo(({ urlObject, publicLink }: { urlObject: string; publicLink?: boolean }) => {
	return (
		<div className="w-full h-full bg-black">
			<video
				controls={true}
				autoPlay={true}
				src={urlObject}
				className={cn("w-full object-contain", publicLink ? "h-[calc(100vh-56px)]" : "h-[calc(100vh-48px)]")}
			/>
		</div>
	)
})

export default Video
