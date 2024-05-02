import { memo } from "react"
import Container from "./container"
import { Loader } from "lucide-react"

export const Async = memo(({ link, messageUUID }: { link: string; messageUUID: string }) => {
	return (
		<Container
			link={link}
			color="blue"
			messageUUID={messageUUID}
		>
			<div className="flex flex-row items-center justify-center w-full h-full">
				<Loader className="animate-spin-medium" />
			</div>
		</Container>
	)
})

export default Async
