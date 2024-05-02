import { memo, useCallback } from "react"
import Container from "./container"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"

export const Image = memo(({ link, messageUUID }: { link: string; messageUUID: string }) => {
	const { t } = useTranslation()

	const open = useCallback(() => {
		eventEmitter.emit("openTransparentFullScreenImageDialog", {
			src: link
		})
	}, [link])

	return (
		<Container
			title={t("image")}
			link={link}
			color="blue"
			messageUUID={messageUUID}
		>
			<img
				src={link}
				className="w-full h-full object-contain cursor-pointer rounded-md"
				onClick={open}
			/>
		</Container>
	)
})

export default Image
