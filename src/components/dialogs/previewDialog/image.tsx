import { memo } from "react"
import { Loader } from "."
import { thumbnailURLObjectCache } from "@/cache"
import { type DriveCloudItem } from "@/components/drive"

export const Image = memo(({ urlObject, item }: { urlObject?: string; item: DriveCloudItem }) => {
	return (
		<>
			{!urlObject && !thumbnailURLObjectCache.has(item.uuid) ? (
				<Loader />
			) : (
				<div className="w-full h-full bg-black">
					<img
						src={urlObject ? urlObject : thumbnailURLObjectCache.get(item.uuid)}
						className="w-full h-[calc(100vh-48px)] object-contain"
						draggable={false}
					/>
				</div>
			)}
		</>
	)
})

export default Image
