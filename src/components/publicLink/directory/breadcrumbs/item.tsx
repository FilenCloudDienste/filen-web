import { memo, useCallback, useMemo } from "react"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { ChevronRight } from "lucide-react"
import { directoryUUIDToNameCache } from "@/cache"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"
import { cn } from "@/lib/utils"

export const Item = memo(({ uuid, info, ex, index }: { info: DirLinkInfoDecryptedResponse; uuid: string; ex: string[]; index: number }) => {
	const { setVirtualURL, virtualURL } = useDirectoryPublicLinkStore(
		useCallback(
			state => ({
				setVirtualURL: state.setVirtualURL,
				virtualURL: state.virtualURL
			}),
			[]
		)
	)

	const currentParent = useMemo(() => {
		return virtualURL.split("/").at(-1) ?? ""
	}, [virtualURL])

	const navigateToPath = useCallback(() => {
		let builtPathname = ""
		const ex = virtualURL.split("/drive/").join("").split("/")

		for (const exItem of ex) {
			builtPathname += builtPathname.length === 0 ? exItem : `/${exItem}`

			if (builtPathname.endsWith(uuid)) {
				setVirtualURL(builtPathname)

				return
			}
		}
	}, [uuid, virtualURL, setVirtualURL])

	return (
		<li className="flex flex-row gap-1 items-center select-none truncate">
			<p
				className={cn(
					"cursor-pointer select-none truncate hover:text-primary",
					uuid === currentParent ? "text-primary" : "text-muted-foreground"
				)}
				onClick={navigateToPath}
			>
				{uuid === info.parent
					? info.metadata.name
					: directoryUUIDToNameCache.has(uuid)
						? directoryUUIDToNameCache.get(uuid)!
						: uuid}
			</p>
			{index < ex.length - 1 && (
				<ChevronRight
					className="shrink-0"
					size={18}
				/>
			)}
		</li>
	)
})

export default Item
