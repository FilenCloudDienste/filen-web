import { memo, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { useLocalStorage } from "@uidotdev/usehooks"
import useMountedEffect from "@/hooks/useMountedEffect"

export const Audio = memo(({ urlObject }: { urlObject: string }) => {
	const publicLinkURLState = usePublicLinkURLState()
	const [volume, setVolume] = useLocalStorage<number>("audioPlayerVolume", 1)
	const ref = useRef<HTMLAudioElement>(null)

	const onVolumeChange = useCallback(() => {
		if (!ref.current) {
			return
		}

		setVolume(ref.current.volume)
	}, [setVolume])

	useMountedEffect(() => {
		if (ref.current) {
			ref.current.volume = volume
		}
	})

	return (
		<div className="w-full h-full bg-black">
			<audio
				ref={ref}
				controls={true}
				autoPlay={!publicLinkURLState.isPublicLink}
				onVolumeChange={onVolumeChange}
				src={urlObject}
				className={cn(
					"w-full object-contain",
					publicLinkURLState.isPublicLink
						? publicLinkURLState.embed || publicLinkURLState.chatEmbed
							? "h-screen"
							: "h-[calc(100vh-56px)]"
						: "h-[calc(100vh-48px)]"
				)}
			/>
		</div>
	)
})

export default Audio
