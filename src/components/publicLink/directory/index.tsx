import { memo, useCallback, useState, useEffect } from "react"
import { useDirectoryPublicLinkInfo, usePublicLinkURLState } from "../../../hooks/usePublicLink"
import Container from "../container"
import { validate as validateUUID } from "uuid"
import Password from "../password"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import DirectoryComponent from "./directory"
import Invalid from "../invalid"

export const Directory = memo(() => {
	const directoryPublicLinkInfo = useDirectoryPublicLinkInfo()
	const [info, setInfo] = useState<DirLinkInfoDecryptedResponse | null>(null)
	const urlState = usePublicLinkURLState()
	const [password, setPassword] = useState<string | undefined>(undefined)

	const onAccess = useCallback(
		(
			_: (Omit<FileLinkInfoResponse, "size"> & { size: number }) | null,
			dirLinkInfo: DirLinkInfoDecryptedResponse | null,
			pass: string
		) => {
			setInfo(dirLinkInfo)
			setPassword(pass)
		},
		[]
	)

	useEffect(() => {
		if (
			directoryPublicLinkInfo.loading ||
			!directoryPublicLinkInfo.status ||
			(directoryPublicLinkInfo.info.hasPassword && typeof password !== "string")
		) {
			return
		}

		setInfo(directoryPublicLinkInfo.info)
	}, [directoryPublicLinkInfo, password])

	return (
		<Container
			loading={directoryPublicLinkInfo.loading}
			hasInfo={
				!directoryPublicLinkInfo.loading && directoryPublicLinkInfo.status
					? directoryPublicLinkInfo.info.hasPassword && typeof password === "string" && password.length > 0
						? true
						: info !== null
					: info !== null
			}
		>
			{!urlState || !urlState.key || urlState.key.length !== 32 ? (
				<Invalid />
			) : info ? (
				<DirectoryComponent
					info={info}
					password={password}
				/>
			) : !directoryPublicLinkInfo.status ? (
				<Invalid />
			) : !validateUUID(directoryPublicLinkInfo.uuid) ? (
				<Invalid />
			) : directoryPublicLinkInfo.info.hasPassword ? (
				<Password
					onAccess={onAccess}
					uuid={directoryPublicLinkInfo.uuid}
					type="directory"
					decryptionKey={urlState.key}
					salt={directoryPublicLinkInfo.info.salt}
				/>
			) : (
				<DirectoryComponent
					info={directoryPublicLinkInfo.info}
					password={password}
				/>
			)}
		</Container>
	)
})

export default Directory
