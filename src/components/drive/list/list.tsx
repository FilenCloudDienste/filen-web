import { memo, useRef } from "react"
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import { useVirtualizer } from "@tanstack/react-virtual"
import ListItem from "./item"
import { type DriveCloudItem } from ".."
import { type UseQueryResult } from "@tanstack/react-query"
import ContextMenu from "./contextMenu"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { useNavigate } from "@tanstack/react-router"
import useLocation from "@/hooks/useLocation"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"

export const List = memo(({ items, query }: { items: DriveCloudItem[]; query: UseQueryResult<DriveCloudItem[], Error> }) => {
	const windowSize = useWindowSize()
	const virtualizerParentRef = useRef<HTMLDivElement>(null)
	const { setItems } = useDriveItemsStore()
	const {
		currentReceiverId,
		currentSharerId,
		setCurrentReceiverId,
		setCurrentSharerId,
		setCurrentReceiverEmail,
		setCurrentReceivers,
		setCurrentSharerEmail
	} = useDriveSharedStore()
	const navigate = useNavigate()
	const location = useLocation()
	const { t } = useTranslation()
	const errorToast = useErrorToast()
	const loadingToast = useLoadingToast()

	const rowVirtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => virtualizerParentRef.current,
		estimateSize: () => 44,
		getItemKey(index) {
			return items[index].uuid
		},
		overscan: 5
	})

	return (
		<ContextMenu>
			<div
				ref={virtualizerParentRef}
				style={{
					height: IS_DESKTOP ? windowSize.height - 48 - 40 - 24 : windowSize.height - 48 - 40,
					overflowX: "hidden",
					overflowY: "auto"
				}}
				className="dragselect-start-allowed"
			>
				<div
					style={{
						height: `${rowVirtualizer.getTotalSize()}px`,
						width: "100%",
						position: "relative"
					}}
					className="dragselect-start-allowed"
				>
					{query.isSuccess &&
						rowVirtualizer.getVirtualItems().map(virtualItem => {
							const item = items[virtualItem.index]

							return (
								<ListItem
									key={virtualItem.key}
									item={item}
									virtualItem={virtualItem}
									items={items}
									index={virtualItem.index}
									type="list"
									setCurrentReceiverEmail={setCurrentReceiverEmail}
									setCurrentReceiverId={setCurrentReceiverId}
									setCurrentReceivers={setCurrentReceivers}
									setCurrentSharerEmail={setCurrentSharerEmail}
									setCurrentSharerId={setCurrentSharerId}
									setItems={setItems}
									currentReceiverId={currentReceiverId}
									currentSharerId={currentSharerId}
									navigate={navigate}
									pathname={location}
									t={t}
									location={location}
									errorToast={errorToast}
									loadingToast={loadingToast}
								/>
							)
						})}
				</div>
			</div>
		</ContextMenu>
	)
})

export default List
