import { memo, useCallback, useState, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import useSDKConfig from "@/hooks/useSDKConfig"
import { getItem } from "@/lib/localForage"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { directoryUUIDToNameCache } from "@/cache"
import useRouteParent from "@/hooks/useRouteParent"
import { cn } from "@/lib/utils"

export const Item = memo(({ path, index, pathname }: { path: string; index: number; pathname: string }) => {
	const { baseFolderUUID } = useSDKConfig()
	const navigate = useNavigate()
	const { t } = useTranslation()
	const [name, setName] = useState<string>(directoryUUIDToNameCache.has(path) ? (directoryUUIDToNameCache.get(path) as string) : "")
	const routeParent = useRouteParent()

	const navigateToPath = useCallback(() => {
		let builtPathname = ""
		const ex = pathname.split("/drive/").join("").split("/")

		for (const exItem of ex) {
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

	const onClick = useCallback(() => {
		navigateToPath()
	}, [navigateToPath])

	useEffect(() => {
		fetchDirectoryName()
	}, [fetchDirectoryName])

	if (path.length === 0 || path === "drive") {
		return null
	}

	return (
		<div
			className="flex flex-row gap-1 items-center select-none"
			style={{
				// @ts-expect-error not typed
				WebkitAppRegion: "no-drag"
			}}
		>
			<p
				className={cn(
					"cursor-pointer select-none hover:text-primary",
					routeParent === path ? "text-primary" : "text-muted-foreground"
				)}
				onClick={onClick}
			>
				{path === baseFolderUUID ? t("topBar.breadcrumb.cloudDrive") : name}
			</p>
			{index < pathname.split("/").length - 1 && (
				<ChevronRight
					size={18}
					className="text-muted-foreground"
				/>
			)}
		</div>
	)
})

export default Item
