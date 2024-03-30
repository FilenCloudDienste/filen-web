import { memo, useCallback, useState, useEffect } from "react"
import Icon from "@/components/icon"
import useSDKConfig from "@/hooks/useSDKConfig"
import { validate as validateUUID } from "uuid"
import { getItem } from "@/lib/localForage"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { directoryUUIDToNameCache } from "@/cache"

export const Item = memo(({ path, index, pathname }: { path: string; index: number; pathname: string }) => {
	const sdkConfig = useSDKConfig()
	const navigate = useNavigate()
	const { t } = useTranslation()
	const [name, setName] = useState<string>(directoryUUIDToNameCache.has(path) ? (directoryUUIDToNameCache.get(path) as string) : "")

	const navigateToPath = useCallback(() => {
		let builtPathname = ""
		const ex = pathname.split("/drive/").join("").split("/")

		for (const exItem of ex) {
			if (!validateUUID(exItem)) {
				continue
			}

			builtPathname += builtPathname.length === 0 ? exItem : `/${exItem}`

			if (builtPathname.endsWith(path)) {
				navigate({
					to: "/drive/$",
					params: {
						_splat: builtPathname
					}
				})

				return
			}
		}
	}, [navigate, path, pathname])

	const fetchDirectoryName = useCallback(async () => {
		if (path === "links") {
			setName(t("topBar.breadcrumbs.links"))

			return
		}

		if (path === "favorites") {
			setName(t("topBar.breadcrumbs.favorites"))

			return
		}

		if (path === "shared-in") {
			setName(t("topBar.breadcrumbs.sharedWithMe"))

			return
		}

		if (path === "shared-out") {
			setName(t("topBar.breadcrumbs.sharedWithOthers"))

			return
		}

		if (path === "trash") {
			setName(t("topBar.breadcrumbs.trash"))

			return
		}

		if (path === "recents") {
			setName(t("topBar.breadcrumbs.recents"))

			return
		}

		try {
			const pathName = await getItem<string | undefined | null>(`directoryUUIDToName:${path}`)

			if (!pathName) {
				//setName(t("topBar.breadcrumbs.directory"))

				return
			}

			directoryUUIDToNameCache.set(path, pathName)

			setName(pathName)
		} catch (e) {
			console.error(e)
		}
	}, [path, t])

	useEffect(() => {
		fetchDirectoryName()
	}, [fetchDirectoryName])

	if (path.length === 0 || path === "drive") {
		return null
	}

	return (
		<div className="flex flex-row gap-1 items-center select-none">
			<p
				className="text-primary cursor-pointer select-none"
				onClick={() => navigateToPath()}
			>
				{path === sdkConfig.baseFolderUUID ? t("topBar.breadcrumb.cloudDrive") : name}
			</p>
			{index < pathname.split("/").length - 1 && (
				<Icon
					name="chevron-right"
					size={18}
				/>
			)}
		</div>
	)
})

export default Item
