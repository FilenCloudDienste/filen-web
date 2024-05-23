import { memo, useCallback } from "react"
import Container from "./container"
import eventEmitter from "@/lib/eventEmitter"
import { useTranslation } from "react-i18next"

export const Image = memo(
	({ link, messageUUID, userId, senderId }: { link: string; messageUUID: string; senderId: number; userId: number }) => {
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
				userId={userId}
				senderId={senderId}
			>
				<img
					src={link}
					className="w-full h-full object-contain cursor-pointer rounded-md"
					onClick={open}
				/>
			</Container>
		)
	}
)

export default Image
