import { memo, useCallback, useState } from "react"
import { useFilePublicLinkHasPassword, usePublicLinkURLState } from "../../../hooks/usePublicLink"
import Container from "../container"
import { validate as validateUUID } from "uuid"
import Password from "../password"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import FileComponent from "./file"

export const File = memo(() => {
	const filePublicLinkHasPassword = useFilePublicLinkHasPassword()
	const [info, setInfo] = useState<(Omit<FileLinkInfoResponse, "size"> & { size: number }) | null>(null)
	const urlState = usePublicLinkURLState()

	const onAccess = useCallback((fileLinkInfo: (Omit<FileLinkInfoResponse, "size"> & { size: number }) | null) => {
		setInfo(fileLinkInfo)
	}, [])

	return (
		<Container loading={!filePublicLinkHasPassword.status}>
			{!urlState || !urlState.key ? (
				<>INvalid link</>
			) : info ? (
				<FileComponent info={info} />
			) : !filePublicLinkHasPassword.status ? null : filePublicLinkHasPassword.key.length !== 32 ||
			  !validateUUID(filePublicLinkHasPassword.uuid) ? (
				<>Invalid link</>
			) : filePublicLinkHasPassword.hasPassword ? (
				<Password
					onAccess={onAccess}
					uuid={filePublicLinkHasPassword.uuid}
					type="file"
					decryptionKey={urlState.key}
					salt={filePublicLinkHasPassword.salt}
				/>
			) : (
				<FileComponent />
			)}
		</Container>
	)
})

export default File
