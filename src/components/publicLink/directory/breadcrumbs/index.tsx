import { memo, useMemo, useCallback } from "react"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import Item from "./item"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"

export const Breadcrumbs = memo(({ info }: { info: DirLinkInfoDecryptedResponse }) => {
	const virtualURL = useDirectoryPublicLinkStore(useCallback(state => state.virtualURL, []))

	const ex = useMemo(() => {
		return virtualURL.split("/")
	}, [virtualURL])

	return ex.map((uuid, index) => {
		return (
			<ul
				className="flex items-center"
				key={uuid}
			>
				<Item
					key={uuid}
					uuid={uuid}
					index={index}
					ex={ex}
					info={info}
				/>
			</ul>
		)
	})
})

export default Breadcrumbs
