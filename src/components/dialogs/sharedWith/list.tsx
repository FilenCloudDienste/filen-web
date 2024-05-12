import { memo, useCallback } from "react"
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
				data={item.receivers}
				totalCount={item.receivers.length}
				height={384}
				width="100%"
				computeItemKey={getItemKey}
				defaultItemHeight={40}
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
