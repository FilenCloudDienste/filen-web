import { memo, useCallback, useMemo } from "react"
import { Virtuoso } from "react-virtuoso"
import Participant from "./participant"
import { type Note, type NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import useSDKConfig from "@/hooks/useSDKConfig"

export const List = memo(({ note, setNote }: { note: Note; setNote: React.Dispatch<React.SetStateAction<Note | null>> }) => {
	const { userId } = useSDKConfig()

	const participantsSorted = useMemo(() => {
		return note.participants.sort((a, b) => a.email.localeCompare(b.email))
	}, [note.participants])

	const getItemKey = useCallback((_: number, participant: NoteParticipant) => participant.userId, [])

	const itemContent = useCallback(
		(_: number, participant: NoteParticipant) => {
			return (
				<Participant
					participant={participant}
					setNote={setNote}
					note={note}
					userId={userId}
				/>
			)
		},
		[setNote, note, userId]
	)

	const style = useMemo((): React.CSSProperties => {
		return {
			overflowX: "hidden",
			overflowY: "auto",
			height: 384 + "px",
			width: "100%"
		}
	}, [])

	return (
		<Virtuoso
			data={participantsSorted}
			totalCount={participantsSorted.length}
			height={384}
			width="100%"
			computeItemKey={getItemKey}
			itemContent={itemContent}
			style={style}
		/>
	)
})

export default List
