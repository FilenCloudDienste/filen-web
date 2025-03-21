import { memo, useMemo } from "react"
import Container from "./container"
import { parseFilenPublicLink } from "../utils"
import { useTheme } from "@/providers/themeProvider"
import { PUBLIC_LINK_BASE_URL } from "@/constants"

export const Filen = memo(
	({ link, messageUUID, userId, senderId }: { link: string; messageUUID: string; senderId: number; userId: number }) => {
		const { dark } = useTheme()

		const parsed = useMemo(() => {
			return parseFilenPublicLink(link)
		}, [link])

		return (
			<Container
				title="Filen"
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
					<iframe
						width="100%"
						height="210px"
						src={`${PUBLIC_LINK_BASE_URL}${parsed.uuid}${encodeURIComponent("#")}${Buffer.from(parsed.key, "utf-8").toString("hex")}?embed=true&theme=${dark ? "dark" : "light"}&chatEmbed=true`}
						title="Filen"
						style={{
							borderRadius: "10px",
							overflow: "hidden",
							border: "none"
						}}
					/>
				</a>
			</Container>
		)
	}
)

export default Filen
