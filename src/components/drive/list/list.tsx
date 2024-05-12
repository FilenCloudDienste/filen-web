import { memo, useMemo, useCallback } from "react"
import { IS_DESKTOP } from "@/constants"
import useWindowSize from "@/hooks/useWindowSize"
import { Virtuoso } from "react-virtuoso"
import ListItem from "./item"
import ContextMenu from "./contextMenu"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { useNavigate } from "@tanstack/react-router"
import useLocation from "@/hooks/useLocation"
import { useTranslation } from "react-i18next"
import useErrorToast from "@/hooks/useErrorToast"
import useLoadingToast from "@/hooks/useLoadingToast"
import { type DriveCloudItem } from ".."
import { useLocalStorage } from "@uidotdev/usehooks"
import { type DriveSortBy } from "./header"
import useRouteParent from "@/hooks/useRouteParent"

export const List = memo(({ items }: { items: DriveCloudItem[] }) => {
	const windowSize = useWindowSize()
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
	const routeParent = useRouteParent()
	const [driveSortBy] = useLocalStorage<DriveSortBy>("driveSortBy", {})

	const virtuosoHeight = useMemo(() => {
		return IS_DESKTOP ? windowSize.height - 48 - 40 - 24 : windowSize.height - 48 - 40
	}, [windowSize.height])

	const getItemKey = useCallback(
		(_: number, item: DriveCloudItem) => `${item.uuid}:${driveSortBy[routeParent] ?? "nameAsc"}`,
		[driveSortBy, routeParent]
	)
	const itemSize = useCallback(() => 44, [])

	const itemContent = useCallback(
		(index: number, item: DriveCloudItem) => {
			return (
				<ListItem
					item={item}
					items={items}
					index={index}
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
		},
		[
			items,
			setCurrentReceiverEmail,
			setCurrentReceiverId,
			setCurrentReceivers,
			setCurrentSharerEmail,
			setCurrentSharerId,
			setItems,
			currentReceiverId,
			currentSharerId,
			navigate,
			location,
			t,
			errorToast,
			loadingToast
		]
	)

	return (
		<ContextMenu>
			<Virtuoso
				data={items}
				totalCount={items.length}
				height={virtuosoHeight}
				width="100%"
				computeItemKey={getItemKey}
				defaultItemHeight={44}
				itemSize={itemSize}
				fixedItemHeight={44}
				itemContent={itemContent}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: virtuosoHeight + "px",
					width: "100%"
				}}
			/>
		</ContextMenu>
	)
})

export default List
