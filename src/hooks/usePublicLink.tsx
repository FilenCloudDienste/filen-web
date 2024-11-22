import { useQuery } from "@tanstack/react-query"
import useLocationHash from "@/hooks/useLocationHash"
import useRouteParent from "@/hooks/useRouteParent"
import worker from "@/lib/worker"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { useMemo } from "react"
import { parseURLSearchParams } from "@/lib/utils"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { type DriveCloudItem } from "@/components/drive"
import { type FileEncryptionVersion } from "@filen/sdk"
import { directoryUUIDToNameCache } from "@/cache"
import { useTheme } from "@/providers/themeProvider"
import useLocation from "./useLocation"

export function usePublicLinkURLState() {
	const locationHash = useLocationHash()
	const routeParent = useRouteParent()
	const { dark } = useTheme()
	const location = useLocation()

	const routeParentNormalized = useMemo(() => {
		return decodeURIComponent(routeParent).split("#").at(0) ?? ""
	}, [routeParent])

	const state = useMemo(() => {
		const locationHashNormalized =
			locationHash.length <= 0 ? decodeURIComponent(location).split("#")[1] ?? "" : decodeURIComponent(locationHash)
		const ex = locationHashNormalized.split("?")
		const parsedSearchParams = ex.length >= 2 ? parseURLSearchParams(`https://filen.io/?${ex[1]}`) : null

		return {
			isPublicLink: location.includes("/f/") || location.includes("/d/"),
			key: ex[0] ? ex[0] : "",
			uuid: routeParentNormalized,
			embed: parsedSearchParams && parsedSearchParams["embed"] === "true" ? true : false,
			color: parsedSearchParams && typeof parsedSearchParams["color"] === "string" ? parsedSearchParams["color"] : null,
			hidePreview: parsedSearchParams && parsedSearchParams["hidePreview"] === "true" ? true : false,
			chatEmbed: parsedSearchParams && parsedSearchParams["chatEmbed"] === "true" ? true : false,
			theme: (parsedSearchParams && parsedSearchParams["theme"] && ["dark", "light"].includes(parsedSearchParams["theme"])
				? parsedSearchParams["theme"]
				: dark
					? "dark"
					: "light") as "dark" | "light"
		}
	}, [locationHash, dark, location, routeParentNormalized])

	return state
}

export type UseFilePublicLinkHasPassword =
	| {
			status: false
			loading: boolean
	  }
	| {
			status: true
			loading: boolean
			uuid: string
			key: string
			hasPassword: boolean
			salt: string
	  }

export function useFilePublicLinkHasPassword(): UseFilePublicLinkHasPassword {
	const urlState = usePublicLinkURLState()
	const routeParent = useRouteParent()

	const routeParentNormalized = useMemo(() => {
		return decodeURIComponent(routeParent).split("#").at(0) ?? ""
	}, [routeParent])

	const passwordQuery = useQuery({
		queryKey: ["filePublicLinkHasPassword", routeParentNormalized],
		queryFn: () => worker.filePublicLinkHasPassword({ uuid: routeParentNormalized }),
		retry: false,
		retryDelay: 0
	})

	return {
		status: passwordQuery.error && passwordQuery.error.message.includes("not found") ? false : passwordQuery.isSuccess,
		loading: passwordQuery.isFetching,
		uuid: routeParentNormalized,
		key: urlState.key,
		hasPassword: passwordQuery.isSuccess ? passwordQuery.data.hasPassword : false,
		salt: passwordQuery.isSuccess ? passwordQuery.data.salt : ""
	}
}

export type UseFilePublicLinkInfo =
	| {
			status: false
			loading: boolean
	  }
	| {
			status: true
			loading: boolean
			uuid: string
			key: string
			info: Omit<FileLinkInfoResponse, "size"> & { size: number }
	  }

export function useFilePublicLinkInfo(info?: Omit<FileLinkInfoResponse, "size"> & { size: number }): UseFilePublicLinkInfo {
	const urlState = usePublicLinkURLState()
	const routeParent = useRouteParent()

	const routeParentNormalized = useMemo(() => {
		return decodeURIComponent(routeParent).split("#").at(0) ?? ""
	}, [routeParent])

	const infoQuery = useQuery({
		queryKey: ["filePublicLinkInfo", routeParentNormalized, info, urlState.key],
		queryFn: () =>
			info
				? Promise.resolve(info as unknown as Omit<FileLinkInfoResponse, "size"> & { size: number })
				: worker.filePublicLinkInfo({
						uuid: routeParentNormalized,
						password: "empty",
						key: urlState.key
					}),
		retry: false,
		retryDelay: 0
	})

	return {
		status: infoQuery.error && infoQuery.error.message.includes("not found") ? false : infoQuery.isSuccess,
		loading: infoQuery.isFetching,
		uuid: routeParentNormalized,
		key: urlState.key,
		info: infoQuery.data!
	}
}

export type UseDirectoryLinkInfo =
	| {
			status: false
			loading: boolean
	  }
	| {
			status: true
			loading: boolean
			uuid: string
			key: string
			info: DirLinkInfoDecryptedResponse
	  }

export function useDirectoryPublicLinkInfo(info?: DirLinkInfoDecryptedResponse): UseDirectoryLinkInfo {
	const urlState = usePublicLinkURLState()
	const routeParent = useRouteParent()

	const routeParentNormalized = useMemo(() => {
		return decodeURIComponent(routeParent).split("#").at(0) ?? ""
	}, [routeParent])

	const infoQuery = useQuery({
		queryKey: ["directoryPublicLinkInfo", routeParentNormalized, info, urlState.key],
		queryFn: () =>
			info
				? Promise.resolve(info)
				: worker.directoryPublicLinkInfo({
						uuid: routeParentNormalized,
						key: urlState.key
					}),
		retry: false,
		retryDelay: 0
	})

	return {
		status: infoQuery.error && infoQuery.error.message.includes("not found") ? false : infoQuery.isSuccess,
		loading: infoQuery.isFetching,
		uuid: routeParentNormalized,
		key: urlState.key,
		info: infoQuery.data!
	}
}

export function useDirectoryLinkContent({
	uuid,
	key,
	info,
	parent,
	password
}: {
	info: DirLinkInfoDecryptedResponse
	parent: string
	uuid: string
	key: string
	password?: string
}) {
	const query = useQuery({
		queryKey: ["directoryPublicLinkContent", uuid, key, password, info.salt, parent],
		queryFn: () =>
			worker.directoryPublicLinkContent({
				uuid,
				key,
				password,
				salt: info.salt,
				parent
			})
	})

	const content = useMemo((): DriveCloudItem[] => {
		if (!query.isSuccess) {
			return []
		}

		for (const directory of query.data.folders) {
			directoryUUIDToNameCache.set(directory.uuid, directory.metadata.name)
		}

		return [
			...query.data.folders.map(
				folder =>
					({
						type: "directory",
						name: folder.metadata.name,
						color: folder.color,
						uuid: folder.uuid,
						timestamp: folder.timestamp,
						selected: false,
						receiverEmail: "",
						receiverId: 0,
						receivers: [],
						sharerEmail: "",
						sharerId: 0,
						size: query.data.directorySize[folder.uuid] ? query.data.directorySize[folder.uuid]! : 0,
						favorited: false,
						lastModified: folder.timestamp,
						parent: folder.parent
					}) satisfies DriveCloudItem
			),
			...query.data.files.map(
				file =>
					({
						type: "file",
						name: file.metadata.name,
						key: file.metadata.key,
						mime: file.metadata.mime,
						rm: "",
						version: file.version as unknown as FileEncryptionVersion,
						region: file.region,
						bucket: file.bucket,
						chunks: file.chunks,
						uuid: file.uuid,
						timestamp: file.timestamp,
						selected: false,
						receiverEmail: "",
						receiverId: 0,
						receivers: [],
						sharerEmail: "",
						sharerId: 0,
						size: file.size,
						favorited: false,
						lastModified: file.metadata.lastModified,
						parent: file.parent
					}) satisfies DriveCloudItem
			)
		]
	}, [query.isSuccess, query.data])

	return {
		query,
		content
	}
}
