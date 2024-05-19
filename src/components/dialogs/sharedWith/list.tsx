import { memo, useCallback, useMemo } from "react"
import { type DriveCloudItem } from "../../drive"
import { Virtuoso } from "react-virtuoso"
import Receiver from "./receiver"
import { type CloudItemReceiver } from "@filen/sdk/dist/types/cloud"

export const List = memo(
	({
		item,
		setItem,
		setOpen
	}: {
		item: DriveCloudItem
		setItem: React.Dispatch<React.SetStateAction<DriveCloudItem | null>>
		setOpen: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const receiversSorted = useMemo(() => {
			return item.receivers.sort((a, b) => a.email.localeCompare(b.email))
		}, [item.receivers])

		const getItemKey = useCallback((_: number, receiver: CloudItemReceiver) => receiver.id, [])

		const itemContent = useCallback(
			(_: number, receiver: CloudItemReceiver) => {
				return (
					<Receiver
						receiver={receiver}
						setItem={setItem}
						item={item}
						setOpen={setOpen}
					/>
				)
			},
			[setItem, item, setOpen]
		)

		return (
			<Virtuoso
				data={receiversSorted}
				totalCount={receiversSorted.length}
				height={384}
				width="100%"
				computeItemKey={getItemKey}
				itemContent={itemContent}
				style={{
					overflowX: "hidden",
					overflowY: "auto",
					height: 384 + "px",
					width: "100%"
				}}
			/>
		)
	}
)

export default List
