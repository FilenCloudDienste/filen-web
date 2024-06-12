import { memo, useCallback, useState } from "react"
import { useFilePublicLinkHasPassword, usePublicLinkURLState } from "../../../hooks/usePublicLink"
import Container from "../container"
import { validate as validateUUID } from "uuid"
import Password from "../password"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import FileComponent from "./file"
import Invalid from "../invalid"

export const File = memo(() => {
	const filePublicLinkHasPassword = useFilePublicLinkHasPassword()
	const [info, setInfo] = useState<(Omit<FileLinkInfoResponse, "size"> & { size: number }) | null>(null)
	const urlState = usePublicLinkURLState()

	const onAccess = useCallback((fileLinkInfo: (Omit<FileLinkInfoResponse, "size"> & { size: number }) | null) => {
		setInfo(fileLinkInfo)
	}, [])

	return (
		<Container
			loading={filePublicLinkHasPassword.loading}
			hasInfo={info !== null}
		>
			{!urlState || !urlState.key || urlState.key.length !== 32 ? (
				<Invalid />
			) : info ? (
				<FileComponent info={info} />
			) : !filePublicLinkHasPassword.status ? (
				<Invalid />
			) : filePublicLinkHasPassword.key.length !== 32 || !validateUUID(filePublicLinkHasPassword.uuid) ? (
				<Invalid />
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
