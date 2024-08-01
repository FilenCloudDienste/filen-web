import { memo, useMemo } from "react"
import { type GeneralError } from "@/stores/syncs.store"
import { XCircle, ArrowUpDown, HardDrive } from "lucide-react"
import { useTranslation } from "react-i18next"

export type ErrorType =
	| "permission"
	| "io"
	| "noSpace"
	| "openFiles"
	| "fileOrDirExists"
	| "fileOrDirNotFound"
	| "isFile"
	| "isDir"
	| "notDir"
	| "badConnection"
	| "fileOrDirTemporarilyUnavailable"
	| "unknown"
	| "dirNotEmpty"
	| "fileOrDirNameTooLong"

export const ERRORS: Record<string, ErrorType> = {
	EPERM: "permission",
	EACCES: "permission",
	EEXIST: "fileOrDirExists",
	ENOENT: "fileOrDirNotFound",
	ENOTDIR: "notDir",
	ECONNREFUSED: "badConnection",
	ENOTFOUND: "badConnection",
	EPIPE: "badConnection",
	ETIMEDOUT: "badConnection",
	EAGAIN: "fileOrDirTemporarilyUnavailable",
	EBUSY: "fileOrDirTemporarilyUnavailable",
	EDESTADDRREQ: "badConnection",
	EFAULT: "io",
	EHOSTUNREACH: "badConnection",
	EINTR: "io",
	EINVAL: "unknown",
	EIO: "io",
	EISCONN: "badConnection",
	EMSGSIZE: "unknown",
	ENETDOWN: "badConnection",
	ENETRESET: "badConnection",
	ENETUNREACH: "badConnection",
	EDOM: "unknown",
	ENOTEMPTY: "dirNotEmpty",
	EMFILE: "openFiles",
	ENAMETOOLONG: "fileOrDirNameTooLong",
	EISFILE: "isFile",
	ENFILE: "io",
	ENOMEM: "io",
	ETXTBSY: "io",
	EAI_SYSTEM: "io",
	EAI_CANCELED: "io",
	EUNKNOWN: "unknown",
	ENODEV: "io",
	ENOBUFS: "io",
	ENOSPC: "noSpace",
	EROFS: "io",
	ECANCELED: "io",
	EBADF: "io"
}

export const ERRORS_ARRAY: string[] = Object.keys(ERRORS)

export const Issue = memo(({ error }: { error: GeneralError }) => {
	const { t } = useTranslation()

	const parsedErrorType = useMemo((): ErrorType => {
		const concatted = (error.error.name + " " + error.error.message).toLowerCase()

		for (const err of ERRORS_ARRAY) {
			if (concatted.includes(err.toLowerCase())) {
				return ERRORS[err] ? ERRORS[err]! : "unknown"
			}
		}

		return "unknown"
	}, [error.error.message, error.error.name])

	return (
		<div className="flex flex-row px-4">
			<div className="flex flex-row border-b w-full p-2.5 py-3 hover:bg-secondary hover:rounded-sm">
				<div className="flex flex-row gap-2.5">
					<div className="flex flex-row">
						<div className="bg-secondary rounded-md flex items-center justify-center aspect-square w-10 h-10">
							{error.type === "cycle" || error.type === "general" ? (
								<XCircle
									className="shrink-0 text-red-500"
									size={26}
								/>
							) : error.type === "localTree" ? (
								<HardDrive
									className="shrink-0 text-red-500"
									size={26}
								/>
							) : (
								<ArrowUpDown
									className="shrink-0 text-red-500"
									size={26}
								/>
							)}
						</div>
					</div>
					<div className="flex flex-col">
						<p className="line-clamp-1 text-ellipsis break-all">{t("syncs.issues.types.title." + parsedErrorType)}</p>
						<p className="line-clamp-6 text-ellipsis break-all text-muted-foreground text-sm">
							{t("syncs.issues.types.info." + parsedErrorType)}
						</p>
						<p className="line-clamp-6 text-ellipsis break-all text-muted-foreground text-xs mt-1">
							[{error.type}] {error.error.name}: {error.error.message}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
})

export default Issue
