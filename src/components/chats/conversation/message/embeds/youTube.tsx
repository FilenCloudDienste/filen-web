import { memo, useState, useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { parseYouTubeVideoId } from "../utils"
import Container from "./container"
import { PlayCircle } from "lucide-react"
import useElementDimensions from "@/hooks/useElementDimensions"
import { v4 as uuidv4 } from "uuid"
import { cn } from "@/lib/utils"

export type YouTubeInfo = {
	title?: string
	author_name?: string
	author_url?: string
	type?: string
	height?: number
	width?: number
	version?: string
	provider_name?: string
	provider_url?: string
	thumbnail_height?: number
	thumbnail_width?: number
	thumbnail_url?: string
	html?: string
}

export const YouTube = memo(({ link, messageUUID }: { link: string; messageUUID: string }) => {
	const imgId = useRef<string>(uuidv4()).current
	const [play, setPlay] = useState<boolean>(false)
	const parsedLink = useRef<string | null>(parseYouTubeVideoId(link)).current
	const imgDimensions = useElementDimensions(imgId)

	const query = useQuery({
		queryKey: ["chatYouTubeEmbedInfo", link],
		queryFn: () =>
			worker.corsGet(
				"https://www.youtube.com/oembed?url=https://youtube.com/watch?v=" + parseYouTubeVideoId(link) + "&format=json"
			) as YouTubeInfo
	})

	const onPlayClick = useCallback(() => {
		setPlay(true)
	}, [])

	return (
		<Container
			title={query.isSuccess ? query.data.author_name + " - " + query.data.title : "YouTube"}
			link={link}
			color="red"
			messageUUID={messageUUID}
		>
			{play ? (
				<iframe
					width="100%"
					height="100%"
					src={"https://www.youtube.com/embed/" + parsedLink + "?autoplay=1"}
					title={query.isSuccess ? query.data.author_name + " - " + query.data.title : "YouTube"}
					loading="eager"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowFullScreen={true}
					sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation"
					className="overflow-hidden border-none rounded-md shadow-sm"
				/>
			) : (
				<>
					<div
						className={cn(
							"absolute z-50 cursor-pointer",
							imgDimensions.width ? `w-[${imgDimensions.width}px]` : "w-[485px]",
							imgDimensions.height ? `h-[${imgDimensions.height}px]` : "h-[210px]"
						)}
						onClick={onPlayClick}
					>
						<div className="flex flex-row items-center justify-center w-full h-full">
							<div className="cursor-pointer bg-[rgba(1,1,1,0.6)] rounded-full p-1">
								<PlayCircle size={40} />
							</div>
						</div>
					</div>
					<img
						id={imgId}
						src={"https://img.youtube.com/vi/" + parsedLink + "/hqdefault.jpg"}
						className="w-full h-full object-cover cursor-pointer rounded-md"
						onClick={onPlayClick}
					/>
				</>
			)}
		</Container>
	)
})

export default YouTube
