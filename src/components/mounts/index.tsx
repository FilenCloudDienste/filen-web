import { memo, useMemo } from "react"
import useLocation from "@/hooks/useLocation"
import NetworkDrive from "./networkDrive"
import { IS_DESKTOP } from "@/constants"
import WebDAV from "./webdav"
import S3 from "./s3"

export const Mounts = memo(() => {
	const location = useLocation()

	const content = useMemo(() => {
		if (location.includes("/network-drive")) {
			return <NetworkDrive />
		}

		if (location.includes("/webdav")) {
			return <WebDAV />
		}

		if (location.includes("/s3")) {
			return <S3 />
		}

		return null
	}, [location])

	if (!IS_DESKTOP) {
		return null
	}

	return <div className="select-none w-full flex flex-col">{content}</div>
})

export default Mounts
