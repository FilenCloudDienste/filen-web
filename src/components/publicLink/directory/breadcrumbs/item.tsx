import { memo, useCallback } from "react"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import { ChevronRight } from "lucide-react"
import { directoryUUIDToNameCache } from "@/cache"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"

export const Item = memo(({ uuid, info, ex, index }: { info: DirLinkInfoDecryptedResponse; uuid: string; ex: string[]; index: number }) => {
	const { setVirtualURL, virtualURL } = useDirectoryPublicLinkStore()

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
		<div className="flex flex-row gap-1 items-center select-none">
			<p
				className="text-primary cursor-pointer select-none"
				onClick={navigateToPath}
			>
				{uuid === info.parent
					? info.metadata.name
					: directoryUUIDToNameCache.has(uuid)
						? directoryUUIDToNameCache.get(uuid)!
						: uuid}
			</p>
			{index < ex.length - 1 && <ChevronRight size={18} />}
		</div>
	)
})

export default Item
