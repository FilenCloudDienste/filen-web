import { useQuery } from "@tanstack/react-query"
import useLocationHash from "@/hooks/useLocationHash"
import useRouteParent from "@/hooks/useRouteParent"
import worker from "@/lib/worker"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { useMemo } from "react"
import { parseURLSearchParams } from "@/lib/utils"

export function usePublicLinkURLState() {
	const locationHash = useLocationHash()

	const state = useMemo(() => {
		const ex = locationHash.split("?")
		const parsedSearchParams = ex.length >= 2 ? parseURLSearchParams(`https://filen.io/?${ex[1]}`) : null

		return {
			key: ex[0],
			embed: parsedSearchParams && typeof parsedSearchParams["embed"] !== "undefined" ? true : false,
			color: parsedSearchParams && typeof parsedSearchParams["color"] === "string" ? parsedSearchParams["color"] : null,
			hidePreview: parsedSearchParams && typeof parsedSearchParams["hidePreview"] !== "undefined" ? true : false
		}
	}, [locationHash])

	return state
}

export type UseFilePublicLinkHasPassword =
	| {
			status: false
	  }
	| {
			status: true
			uuid: string
			key: string
			hasPassword: boolean
			salt: string
	  }

export function useFilePublicLinkHasPassword(): UseFilePublicLinkHasPassword {
	const urlState = usePublicLinkURLState()
	const routeParent = useRouteParent()

	const passwordQuery = useQuery({
		queryKey: ["filePublicLinkHasPassword", routeParent],
		queryFn: () => worker.filePublicLinkHasPassword({ uuid: routeParent })
	})

	return {
		status: passwordQuery.isSuccess,
		uuid: routeParent,
		key: urlState.key,
		hasPassword: passwordQuery.isSuccess ? passwordQuery.data.hasPassword : false,
		salt: passwordQuery.isSuccess ? passwordQuery.data.salt : ""
	}
}

export type UseFilePublicLinkInfo =
	| {
			status: false
	  }
	| {
			status: true
			uuid: string
			key: string
			info: Omit<FileLinkInfoResponse, "size"> & { size: number }
	  }

export function useFilePublicLinkInfo(info?: Omit<FileLinkInfoResponse, "size"> & { size: number }): UseFilePublicLinkInfo {
	const urlState = usePublicLinkURLState()
	const routeParent = useRouteParent()

	const infoQuery = useQuery({
		queryKey: ["filePublicLinkInfo", routeParent, info, urlState.key],
		queryFn: () =>
			info
				? Promise.resolve(info as unknown as Omit<FileLinkInfoResponse, "size"> & { size: number })
				: worker.filePublicLinkInfo({ uuid: routeParent, password: "empty", key: urlState.key })
	})

	return {
		status: infoQuery.isSuccess,
		uuid: routeParent,
		key: urlState.key,
		info: infoQuery.data!
	}
}
