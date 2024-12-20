import { memo, useMemo } from "react"
import Container from "./container"
import { useTranslation } from "react-i18next"

export const OG = memo(
	({
		link,
		messageUUID,
		ogData,
		userId,
		senderId
	}: {
		link: string
		messageUUID: string
		ogData: Record<string, string>
		senderId: number
		userId: number
	}) => {
		const { t } = useTranslation()

		const { title, description, image } = useMemo(() => {
			return {
				title:
					typeof ogData["og:title"] === "string"
						? ogData["og:title"]
						: typeof ogData["meta:title"] === "string"
							? ogData["meta:title"]
							: typeof ogData["title"] === "string"
								? ogData["title"]
								: t("chats.embeds.og.noTitleAvailable"),
				description:
					typeof ogData["og:description"] === "string"
						? ogData["og:description"]
						: typeof ogData["meta:description"] === "string"
							? ogData["meta:description"]
							: typeof ogData["description"] === "string"
								? ogData["description"]
								: t("chats.embeds.og.noDescriptionAvailable"),
				image:
					typeof ogData["og:image"] === "string"
						? ogData["og:image"]
						: typeof ogData["twitter:image"] === "string"
							? ogData["twitter:image"]
							: null
			}
		}, [ogData, t])

		return (
			<Container
				title={title}
				link={link}
				color="blue"
				messageUUID={messageUUID}
				noBackground={true}
				userId={userId}
				senderId={senderId}
			>
				<a
					href={link}
					target="_blank"
				>
					<p className="text-muted-foreground line-clamp-3 text-ellipsis break-word h-[72px] w-full">{description}</p>
					{image ? (
						<img
							src={image}
							className="w-full h-[130px] object-contain cursor-pointer rounded-md mt-2 bg-primary-foreground p-4"
						/>
					) : (
						<div className="flex flex-row items-center justify-center bg-primary-foreground w-full h-[130px] mt-2 rounded-md">
							<p className="line-clamp-1 text-ellipsis break-all text-muted-foreground">
								{t("chats.embeds.og.noImageAvailable")}
							</p>
						</div>
					)}
				</a>
			</Container>
		)
	}
)

export default OG
