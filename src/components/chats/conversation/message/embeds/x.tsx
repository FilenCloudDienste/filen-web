import { memo } from "react"
import { parseXStatusIdFromURL } from "../utils"
import Container from "./container"
import { TwitterTweetEmbed } from "react-twitter-embed"
import { useTheme } from "@/providers/themeProvider"

export const X = memo(
	({ link, messageUUID, userId, senderId }: { link: string; messageUUID: string; senderId: number; userId: number }) => {
		const { dark } = useTheme()

		return (
			<Container
				title="X.com"
				link={link}
				color="blue"
				noBackground={true}
				messageUUID={messageUUID}
				userId={userId}
				senderId={senderId}
			>
				<TwitterTweetEmbed
					tweetId={parseXStatusIdFromURL(link)}
					options={{
						theme: dark ? "dark" : "light",
						height: 280,
						width: 613
					}}
				/>
			</Container>
		)
	}
)

export default X
